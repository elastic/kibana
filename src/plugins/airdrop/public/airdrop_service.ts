/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Airdrop, TRANSFER_DATA_TYPE } from '@kbn/airdrops';
import { BehaviorSubject, filter, mergeMap, of, Subject } from 'rxjs';

export class AirdropService {
  static dropElement: HTMLElement | null = null;

  private documentEventListenersAdded = false;
  private _isDraggingOver$ = new BehaviorSubject<boolean>(false);
  private _isDragging$ = new BehaviorSubject<boolean>(false);
  private timeRef = 0;
  private airdrop$ = new Subject<Airdrop>();

  constructor() {}

  setup() {}

  start() {
    this.addEventListeners();

    this._isDraggingOver$.subscribe((isDraggingOver) => {
      if (isDraggingOver) {
        document.body.style.setProperty('pointer-events', 'none');
        AirdropService.dropElement?.style.setProperty('width', '100%');
        AirdropService.dropElement?.style.setProperty('height', '100%');
      } else {
        document.body.style.setProperty('pointer-events', 'auto');
        AirdropService.dropElement?.style.setProperty('width', '0');
        AirdropService.dropElement?.style.setProperty('height', '0');
      }
    });

    return {
      isDraggingOver$: this.isDraggingOver$,
      setIsDragging: (isDragging: boolean) => {
        this._isDragging$.next(isDragging);
      },
      getAirdrop$For: this.getAirdrop$For.bind(this),
    };
  }

  public getAirdrop$For<T>(id: string, app?: string) {
    return this.airdrop$.asObservable().pipe(
      filter((airdrop): airdrop is Airdrop<T> => {
        if (app && airdrop.app !== app) return false;
        return airdrop.id === id;
      })
    );
  }

  public get isDraggingOver$() {
    return this._isDragging$.pipe(
      mergeMap((isDragging) => (isDragging ? of(false) : this._isDraggingOver$.asObservable()))
    );
  }

  public get isDragging$() {
    return this._isDragging$.asObservable();
  }

  private addEventListeners() {
    if (this.documentEventListenersAdded) return;

    document.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
      }
    });

    document.addEventListener('dragenter', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        if (this._isDragging$.getValue() || this._isDraggingOver$.getValue()) return;
        this.timeRef = Date.now();
        this._isDraggingOver$.next(true);
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        const diff = Date.now() - this.timeRef;
        if (this._isDragging$.getValue()) return;
        if (diff < 100) return; // Needed to prevent flickering
        this._isDraggingOver$.next(false);
      }
    });

    document.addEventListener('drop', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        this._isDraggingOver$.next(false);
        if (this._isDragging$.getValue()) return;
        const data = e.dataTransfer.getData(TRANSFER_DATA_TYPE);
        const airdrop = JSON.parse(data);
        this.airdrop$.next(airdrop);
        console.log(airdrop);
      }
    });

    this.documentEventListenersAdded = true;
  }

  static async createDropElement() {
    const kibanaBody = await this.getKibanaBody();
    if (!kibanaBody) {
      // probably debug something here
      console.log('Kibana body not found');
      return null;
    }
    this.dropElement = document.createElement('div');

    this.dropElement.style.cssText = `
      position: fixed;
      z-index: 10000;
      top: 0;
      left: 0;
      `;
    kibanaBody.appendChild(this.dropElement);

    return this.dropElement;
  }

  static async getKibanaBody(attempt = 0): Promise<HTMLElement | null> {
    if (attempt > 50) {
      return null;
    }
    const kibanaBody = document.getElementById('kibana-body');
    if (kibanaBody) {
      return kibanaBody;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.getKibanaBody(attempt + 1);
  }
}
