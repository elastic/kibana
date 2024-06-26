/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { TRANSFER_DATA_TYPE } from './constants';

export class AirdropService {
  private isDraggingOver$ = new BehaviorSubject<boolean>(false);
  private isDragging$ = new BehaviorSubject<boolean>(false);
  private dropDiv: HTMLElement | null = null;
  private timeRef = 0;

  setup() {
    return {
      setIsDragging: (isDragging: boolean) => {
        this.isDragging$.next(isDragging);
      },
    };
  }

  start() {
    this.createDropDiv().then((dropDiv) => {
      if (dropDiv) {
        this.addEventListeners();
      }
    });

    this.isDraggingOver$.subscribe((isDraggingOver) => {
      if (isDraggingOver) {
        document.body.style.setProperty('pointer-events', 'none');
        this.dropDiv?.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)');
      } else {
        this.dropDiv?.style.setProperty('background-color', 'transparent');
        document.body.style.setProperty('pointer-events', 'auto');
      }
    });
  }

  private async createDropDiv() {
    const kibanaBody = await this.getKibanaBody();
    if (!kibanaBody) {
      // probably debug something here
      console.log('Kibana body not found');
      return null;
    }
    this.dropDiv = document.createElement('div');

    this.dropDiv.style.cssText = `
      width: 100%;
      height: 100vh;
      position: relative;
      pointer-events: none;
      top: 0;
      left: 0;
      z-index: 1000;
      transform: translateY(-100%);
    `;
    kibanaBody.parentNode?.insertBefore(this.dropDiv, kibanaBody.nextSibling);

    return this.dropDiv;
  }

  private addEventListeners() {
    document.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
      }
    });

    document.addEventListener('dragenter', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        if (this.isDragging$.getValue() || this.isDraggingOver$.getValue()) return;
        this.timeRef = Date.now();
        this.isDraggingOver$.next(true);
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        const diff = Date.now() - this.timeRef; // Needed to prevent flickering
        if (this.isDragging$.getValue()) return;
        if (diff < 100) return;
        this.isDraggingOver$.next(false);
      }
    });

    document.addEventListener('drop', (e) => {
      if (e.dataTransfer?.types.includes(TRANSFER_DATA_TYPE)) {
        e.preventDefault();
        this.isDraggingOver$.next(false);
        if (this.isDragging$.getValue()) return;
        const data = e.dataTransfer.getData(TRANSFER_DATA_TYPE);
        const jsonObject = JSON.parse(data);
        // setFormState(jsonObject);
        console.log(jsonObject);
      }
    });
  }

  private async getKibanaBody(attempt = 0): Promise<HTMLElement | null> {
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
