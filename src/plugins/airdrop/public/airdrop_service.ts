/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, mergeMap } from 'rxjs';
import { TRANSFER_DATA_TYPE } from './constants';

export class AirdropService {
  private documentEventListenersAdded = false;
  private _isDraggingOver$ = new BehaviorSubject<boolean>(false);
  private _isDragging$ = new BehaviorSubject<boolean>(false);
  private dropDiv: HTMLElement | null = null;
  private timeRef = 0;

  constructor() {}

  setup() {
    // this.addEventListeners();
    // return {
    //   setIsDragging: (isDragging: boolean) => {
    //     this.isDragging$.next(isDragging);
    //   },
    // };
  }

  start() {
    // if (!dropDiv) return;

    this.addEventListeners();

    // this.createDropDiv().then((dropDiv) => {
    //   if (dropDiv) {
    //   }
    // });

    this._isDraggingOver$.subscribe((isDraggingOver) => {
      console.log('isDraggingOver', isDraggingOver);
      if (isDraggingOver) {
        document.body.style.setProperty('pointer-events', 'none');

        // this.dropDiv?.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)');
      } else {
        // this.dropDiv?.style.setProperty('background-color', 'transparent');
        document.body.style.setProperty('pointer-events', 'auto');
      }
    });

    return {
      isDraggingOver$: this.isDraggingOver$,
      setIsDragging: (isDragging: boolean) => {
        this._isDragging$.next(isDragging);
      },
    };
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
        const diff = Date.now() - this.timeRef; // Needed to prevent flickering
        if (this._isDragging$.getValue()) return;
        if (diff < 100) return;
        this._isDraggingOver$.next(false);
      }
    });

    document.addEventListener('drop', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        this._isDraggingOver$.next(false);
        if (this._isDragging$.getValue()) return;
        const data = e.dataTransfer.getData(TRANSFER_DATA_TYPE);
        const jsonObject = JSON.parse(data);
        // setFormState(jsonObject);
        console.log(jsonObject);
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
    const dropElement = document.createElement('div');

    // width: 100%;
    // pointer-events: none;
    // height: 100vh;
    // top: 0;
    // left: 0;
    // transform: translateY(-100%);
    dropElement.style.cssText = `
      position: relative;
      z-index: 1000;
    `;
    kibanaBody.parentNode?.insertBefore(dropElement, kibanaBody.nextSibling);

    return dropElement;
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
