/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { SavedObjectsClientContract } from 'kibana/public';
import { NoteSavedObjectAttributes, NOTE_SAVED_OBJECT } from '../../common';
import {
  Embeddable,
  IContainer,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../src/plugins/embeddable/public';
import { NoteEmbeddableComponent } from './note_component';

// Notice this is not the same value as the 'note' saved object type. Many of our
// cases in prod today use the same value, but this is unnecessary.
export const NOTE_EMBEDDABLE = 'NOTE_EMBEDDABLE';

export interface NoteEmbeddableInput extends SavedObjectEmbeddableInput {
  /**
   * Optional search string to highlight in the note. Will also dictate output.hasMatch.
   */
  search?: string;
  /**
   * If undefined, then there are no local edits or overrides and a valid
   * `savedObjectId` should be supplied.
   */
  attributes?: NoteSavedObjectAttributes;
}

export interface NoteEmbeddableOutput extends EmbeddableOutput {
  /**
   * Whether or not any values match the search string. Will check input.attributes first,
   * otherwise will check output.savedAttributes.
   */
  hasMatch: boolean;
  /**
   * If a valid `input.savedObjectId` was given, this will hold the last retrieved attributes
   * from the saved object.
   */
  savedAttributes?: NoteSavedObjectAttributes;
}

function getHasMatch(note: NoteEmbeddable): boolean {
  const to = note.getTo();
  const from = note.getFrom();
  const message = note.getMessage();
  const { search } = note.getInput();
  if (!search) return true;
  if (!message) return false;
  return Boolean(message.match(search) || to?.match(search) || from?.match(search));
}

/**
 * This is an example of an embeddable that can optionally be backed by a saved object.
 */

export class NoteEmbeddable extends Embeddable<NoteEmbeddableInput, NoteEmbeddableOutput> {
  public readonly type = NOTE_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectId?: string;

  constructor(
    input: NoteEmbeddableInput,
    {
      parent,
      savedObjectsClient,
    }: {
      parent?: IContainer;
      savedObjectsClient: SavedObjectsClientContract;
    }
  ) {
    super(
      input,
      { hasMatch: false, defaultTitle: input.to ? `A note to ${input.to}` : `A note` },
      parent
    );
    this.savedObjectsClient = savedObjectsClient;

    this.subscription = Rx.merge(this.getOutput$(), this.getInput$()).subscribe(async () => {
      const { savedObjectId } = this.getInput();
      if (this.savedObjectId !== savedObjectId) {
        this.savedObjectId = savedObjectId;
        if (savedObjectId !== undefined) {
          this.reload();
        }
      }
      this.updateOutput({
        hasMatch: getHasMatch(this),
      });
    });
  }

  public getTo() {
    return this.input.attributes?.to ?? this.output.savedAttributes?.to;
  }

  public getFrom() {
    return this.input.attributes?.from ?? this.output.savedAttributes?.from;
  }

  public getMessage() {
    return this.input.attributes?.message ?? this.output.savedAttributes?.message;
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<NoteEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    if (this.savedObjectId !== undefined) {
      const savedObject = await this.savedObjectsClient.get<NoteSavedObjectAttributes>(
        NOTE_SAVED_OBJECT,
        this.savedObjectId
      );
      const defaultTitle = this.input.to ? `A note to ${this.input.to}` : `A note`;
      this.updateOutput({
        hasMatch: getHasMatch(this),
        title: this.input.title ?? defaultTitle,
        defaultTitle,
        savedAttributes: savedObject.attributes,
      });
      if (this.node) {
        this.render(this.node);
      }
    }
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
