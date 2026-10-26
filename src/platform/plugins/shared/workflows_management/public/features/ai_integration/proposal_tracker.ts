/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ProposalStatus = 'pending' | 'accepted' | 'declined';

export interface ProposalRecord {
  proposalId: string;
  status: ProposalStatus;
  beforeYaml: string;
  afterYaml: string;
  description?: string;
  toolId: string;
  attachmentVersion: number;
}

type Listener = () => void;
type AllResolvedCallback = () => void;

export class ProposalTracker {
  private records = new Map<string, ProposalRecord>();
  private listeners = new Set<Listener>();
  private allResolvedCallbacks = new Set<AllResolvedCallback>();
  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private checkAllResolved(): void {
    if (this.records.size > 0 && this.areAllResolved()) {
      this.allResolvedCallbacks.forEach((cb) => cb());
    }
  }

  setRecord(record: ProposalRecord): void {
    this.records.set(record.proposalId, record);
    this.notify();
  }

  getRecord(proposalId: string): ProposalRecord | undefined {
    return this.records.get(proposalId);
  }

  getAllRecords(): ProposalRecord[] {
    return Array.from(this.records.values());
  }

  updateStatus(proposalId: string, status: ProposalStatus): void {
    const record = this.records.get(proposalId);
    if (!record) return;

    record.status = status;
    this.notify();
    this.checkAllResolved();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  areAllResolved(): boolean {
    if (this.records.size === 0) return true;
    for (const record of this.records.values()) {
      if (record.status === 'pending') return false;
    }
    return true;
  }

  onAllResolved(cb: AllResolvedCallback): () => void {
    this.allResolvedCallbacks.add(cb);
    return () => {
      this.allResolvedCallbacks.delete(cb);
    };
  }

  /**
   * Cascade-decline all pending proposals whose `attachmentVersion` is >= the
   * version of the declined proposal. Returns the IDs of cascaded proposals
   * (excluding the originally declined one).
   */
  cascadeDecline(proposalId: string): string[] {
    const target = this.records.get(proposalId);
    if (!target) return [];

    target.status = 'declined';

    const cascaded: string[] = [];

    for (const record of this.records.values()) {
      if (
        record.proposalId !== proposalId &&
        record.status === 'pending' &&
        record.attachmentVersion >= target.attachmentVersion
      ) {
        record.status = 'declined';
        cascaded.push(record.proposalId);
      }
    }

    this.notify();
    this.checkAllResolved();

    return cascaded;
  }

  clear(proposalId: string): void {
    this.records.delete(proposalId);
    this.notify();
  }

  clearAll(): void {
    this.records.clear();
    this.notify();
  }
}
