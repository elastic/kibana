/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import type { SlotResources } from './get_slot_resources';

const EPSILON = 0.000001;

export enum Phase {
  BeforeStart = 'before_start',
  Warming = 'warming',
  Running = 'running',
  Done = 'done',
}

interface PhaseResourceUsage {
  cpu: number;
  memory: number;
  exclusive?: boolean;
}

interface AcquireOptions {
  label: string;
  priority?: number;
  resources: SlotResources;
}

interface SlotMetadata {
  label: string;
  priority: number;
  resources: SlotResources;
  sequence: number;
  phase: Phase;
}

interface QueueItem {
  slot: Slot;
  resolve: () => void;
}

export class ResourcePool {
  private readonly log: ToolingLog;
  private readonly totalCpuBudget: number;
  private readonly totalMemoryBudget: number;

  private readonly slotStates = new WeakMap<Slot, Phase>();
  private readonly slotMetadata = new WeakMap<Slot, SlotMetadata>();
  private readonly warmingQueue: QueueItem[] = [];
  private readonly runningQueue: QueueItem[] = [];

  private usedCpu = 0;
  private usedMemory = 0;
  private warmingExclusiveCount = 0;
  private runningExclusiveCount = 0;
  private memoryCapacity = 0;
  private sequenceCounter = 0;

  constructor({
    log,
    totalCpu,
    totalMemory,
  }: {
    log: ToolingLog;
    totalCpu: number;
    totalMemory: number;
  }) {
    this.log = log;
    this.totalCpuBudget = Math.max(1, totalCpu);
    this.totalMemoryBudget = Math.max(0, totalMemory);
    this.recalculateCapacity();
  }

  acquire(options: AcquireOptions): Slot {
    const { label, priority = 0, resources } = options;

    const slot: Partial<Slot> = {};
    const typedSlot = slot as Slot;

    const metadata: SlotMetadata = {
      label,
      priority,
      resources,
      sequence: this.sequenceCounter++,
      phase: Phase.BeforeStart,
    };

    this.slotStates.set(typedSlot, Phase.BeforeStart);
    this.slotMetadata.set(typedSlot, metadata);

    slot.waitForWarming = async () => {
      await this.waitForWarming(typedSlot);
    };

    slot.waitForRunning = async () => {
      await this.waitForRunning(typedSlot);
    };

    slot.release = () => {
      this.release(typedSlot);
    };

    slot.getPhase = () => this.getPhase(typedSlot);

    return typedSlot;
  }

  private logStats(label: string) {
    this.log.debug(
      `[resource-pool:${label}] cpu=${this.usedCpu}/${this.totalCpuBudget}, memory=${this.usedMemory}/${this.memoryCapacity}, warmingExclusive=${this.warmingExclusiveCount}, runningExclusive=${this.runningExclusiveCount}, waitingWarming=${this.warmingQueue.length}, waitingRunning=${this.runningQueue.length}`
    );
  }

  private async waitForWarming(slot: Slot) {
    const phase = this.getPhase(slot);

    if (phase !== Phase.BeforeStart) {
      throw new Error(`Cannot warm slot in phase [${phase}]`);
    }

    if (this.canAllocatePhase(slot, Phase.Warming)) {
      this.applyPhaseChange(slot, Phase.Warming);
      this.logStats('warming-acquired');
      return;
    }

    await new Promise<void>((resolve) => {
      this.warmingQueue.push({ slot, resolve });
      this.logStats('warming-wait');
      this.allocate();
    });
  }

  private async waitForRunning(slot: Slot) {
    const phase = this.getPhase(slot);

    if (phase !== Phase.Warming) {
      if (phase === Phase.Running) {
        return;
      }
      throw new Error(`Cannot run slot in phase [${phase}]`);
    }

    if (this.canAllocatePhase(slot, Phase.Running)) {
      this.applyPhaseChange(slot, Phase.Running);
      this.logStats('running-acquired');
      return;
    }

    await new Promise<void>((resolve) => {
      this.runningQueue.push({ slot, resolve });
      this.logStats('running-wait');
      this.allocate();
    });
  }

  private release(slot: Slot) {
    const metadata = this.getMetadata(slot);
    const phase = this.getPhase(slot);

    if (phase === Phase.BeforeStart) {
      this.removeFromQueues(slot);
      this.logStats('release-before-start');
    } else if (phase === Phase.Warming) {
      this.removeResources(metadata.resources.warming, Phase.Warming);
      this.logStats('release-warming');
    } else if (phase === Phase.Running) {
      this.removeResources(metadata.resources.running, Phase.Running);
      this.logStats('release-running');
    }

    metadata.phase = Phase.Done;
    this.setPhase(slot, Phase.Done);
    this.removeFromQueues(slot);
    this.recalculateCapacity();
    this.allocate();
  }

  private allocate() {
    let madeProgress = false;

    do {
      madeProgress = false;
      this.recalculateCapacity();

      if (this.tryGrantRunning()) {
        madeProgress = true;
      }

      if (this.tryGrantWarming()) {
        madeProgress = true;
      }
    } while (madeProgress);
  }

  private tryGrantWarming(): boolean {
    let granted = false;

    while (true) {
      const next = this.pickNextCandidate(this.warmingQueue, Phase.Warming);
      if (!next) {
        break;
      }

      const { slot, resolve } = next;
      this.applyPhaseChange(slot, Phase.Warming);
      this.logStats('warming-granted');
      granted = true;
      resolve();
    }

    return granted;
  }

  private tryGrantRunning(): boolean {
    let granted = false;

    while (true) {
      const next = this.pickNextCandidate(this.runningQueue, Phase.Running);
      if (!next) {
        break;
      }

      const { slot, resolve } = next;
      this.applyPhaseChange(slot, Phase.Running);
      this.logStats('running-granted');
      granted = true;
      resolve();
    }

    return granted;
  }

  private pickNextCandidate(queue: QueueItem[], phase: Phase): QueueItem | undefined {
    let selectedIndex = -1;
    let selectedMetadata: SlotMetadata | undefined;

    const expectedPhase = phase === Phase.Warming ? Phase.BeforeStart : Phase.Warming;

    for (let index = 0; index < queue.length; index += 1) {
      const entry = queue[index];
      const metadata = this.slotMetadata.get(entry.slot);
      const currentPhase = this.getPhase(entry.slot);

      if (!metadata || metadata.phase === Phase.Done || currentPhase !== expectedPhase) {
        queue.splice(index, 1);
        index -= 1;
        continue;
      }

      if (!this.canAllocatePhase(entry.slot, phase)) {
        continue;
      }

      if (!selectedMetadata) {
        selectedIndex = index;
        selectedMetadata = metadata;
        continue;
      }

      if (this.isBetterCandidate(metadata, selectedMetadata, phase)) {
        selectedIndex = index;
        selectedMetadata = metadata;
      }
    }

    if (selectedIndex === -1) {
      return undefined;
    }

    return queue.splice(selectedIndex, 1)[0];
  }

  private isBetterCandidate(
    candidate: SlotMetadata,
    incumbent: SlotMetadata,
    phase: Phase
  ): boolean {
    if (candidate.priority !== incumbent.priority) {
      return candidate.priority < incumbent.priority;
    }

    const candidateResources = this.getPhaseResource(candidate, phase);
    const incumbentResources = this.getPhaseResource(incumbent, phase);

    if (candidateResources.memory !== incumbentResources.memory) {
      return candidateResources.memory > incumbentResources.memory;
    }

    if (candidateResources.cpu !== incumbentResources.cpu) {
      return candidateResources.cpu > incumbentResources.cpu;
    }

    return candidate.sequence < incumbent.sequence;
  }

  private getPhaseResource(metadata: SlotMetadata, phase: Phase): PhaseResourceUsage {
    if (phase === Phase.Warming) {
      return metadata.resources.warming;
    }

    if (phase === Phase.Running) {
      return metadata.resources.running;
    }

    throw new Error(`Unsupported phase resource lookup [${phase}]`);
  }

  private canAllocatePhase(slot: Slot, phase: Phase): boolean {
    const metadata = this.slotMetadata.get(slot);
    if (!metadata) {
      return false;
    }

    if (phase === Phase.Warming) {
      const resources = metadata.resources.warming;

      if (resources.exclusive && this.warmingExclusiveCount > 0) {
        return false;
      }

      const cpuAfter = this.usedCpu + resources.cpu;
      if (cpuAfter - this.totalCpuBudget > EPSILON) {
        return false;
      }

      const memoryAfter = this.usedMemory + resources.memory;
      if (memoryAfter - this.memoryCapacity > EPSILON) {
        return false;
      }

      return true;
    }

    if (phase === Phase.Running) {
      const runningResources = metadata.resources.running;
      return !(runningResources.exclusive && this.runningExclusiveCount > 0);
    }

    return false;
  }

  private applyPhaseChange(slot: Slot, phase: Phase) {
    const metadata = this.getMetadata(slot);
    const previousPhase = metadata.phase;

    if (previousPhase === phase) {
      return;
    }

    if (previousPhase === Phase.Warming) {
      this.removeResources(metadata.resources.warming, Phase.Warming);
    } else if (previousPhase === Phase.Running) {
      this.removeResources(metadata.resources.running, Phase.Running);
    }

    if (phase === Phase.Warming) {
      this.addResources(metadata.resources.warming, Phase.Warming);
    } else if (phase === Phase.Running) {
      this.addResources(metadata.resources.running, Phase.Running);
    }

    metadata.phase = phase;
    this.setPhase(slot, phase);
    this.recalculateCapacity();
  }

  private addResources(resources: PhaseResourceUsage, phase: Phase) {
    this.usedCpu = this.roundToPrecision(this.usedCpu + resources.cpu);
    this.usedMemory = this.roundToPrecision(this.usedMemory + resources.memory);

    if (phase === Phase.Warming && resources.exclusive) {
      this.warmingExclusiveCount += 1;
    }

    if (phase === Phase.Running && resources.exclusive) {
      this.runningExclusiveCount += 1;
    }
  }

  private removeResources(resources: PhaseResourceUsage, phase: Phase) {
    this.usedCpu = this.roundToPrecision(Math.max(0, this.usedCpu - resources.cpu));
    this.usedMemory = this.roundToPrecision(Math.max(0, this.usedMemory - resources.memory));

    if (phase === Phase.Warming && resources.exclusive) {
      this.warmingExclusiveCount = Math.max(0, this.warmingExclusiveCount - 1);
    }

    if (phase === Phase.Running && resources.exclusive) {
      this.runningExclusiveCount = Math.max(0, this.runningExclusiveCount - 1);
    }
  }

  private removeFromQueues(slot: Slot) {
    this.warmingQueue.splice(
      0,
      this.warmingQueue.length,
      ...this.warmingQueue.filter((entry) => entry.slot !== slot)
    );
    this.runningQueue.splice(
      0,
      this.runningQueue.length,
      ...this.runningQueue.filter((entry) => entry.slot !== slot)
    );
  }

  private recalculateCapacity() {
    this.memoryCapacity = this.totalMemoryBudget;
  }

  private getPhase(slot: Slot) {
    return this.slotStates.get(slot) ?? Phase.Done;
  }

  private setPhase(slot: Slot, phase: Phase) {
    const previous = this.getPhase(slot);
    const label = this.slotMetadata.get(slot)?.label ?? 'unknown';
    this.log.debug(`[resource-pool:slot] ${label} ${previous} -> ${phase}`);
    this.slotStates.set(slot, phase);
  }

  private getMetadata(slot: Slot): SlotMetadata {
    const metadata = this.slotMetadata.get(slot);
    if (!metadata) {
      throw new Error('Unknown slot');
    }
    return metadata;
  }

  private roundToPrecision(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}

export interface Slot {
  waitForWarming(): Promise<void>;
  waitForRunning(): Promise<void>;
  release(): void;
  getPhase(): Phase;
}
