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
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
  AttributeService,
} from '../../../../src/plugins/embeddable/public';
import { BookSavedObjectAttributes } from '../../common';
import { BookEmbeddableComponent } from './book_component';

export const BOOK_EMBEDDABLE = 'book';
export type BookEmbeddableInput = BookByValueInput | BookByReferenceInput;
export interface BookEmbeddableOutput extends EmbeddableOutput {
  hasMatch: boolean;
  attributes: BookSavedObjectAttributes;
}

interface BookInheritedInput extends EmbeddableInput {
  search?: string;
}

export type BookByValueInput = { attributes: BookSavedObjectAttributes } & BookInheritedInput;
export type BookByReferenceInput = SavedObjectEmbeddableInput & BookInheritedInput;

/**
 * Returns whether any attributes contain the search string.  If search is empty, true is returned. If
 * there are no savedAttributes, false is returned.
 * @param search - the search string
 * @param savedAttributes - the saved object attributes for the saved object with id `input.savedObjectId`
 */
function getHasMatch(search?: string, savedAttributes?: BookSavedObjectAttributes): boolean {
  if (!search) return true;
  if (!savedAttributes) return false;
  return Boolean(
    (savedAttributes.author && savedAttributes.author.match(search)) ||
      (savedAttributes.title && savedAttributes.title.match(search))
  );
}

export class BookEmbeddable extends Embeddable<BookEmbeddableInput, BookEmbeddableOutput> {
  public readonly type = BOOK_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectId?: string;
  private attributes?: BookSavedObjectAttributes;

  constructor(
    initialInput: BookEmbeddableInput,
    private attributeService: AttributeService<
      BookSavedObjectAttributes,
      BookByValueInput,
      BookByReferenceInput
    >,
    {
      parent,
    }: {
      parent?: IContainer;
    }
  ) {
    super(initialInput, {} as BookEmbeddableOutput, parent);

    this.subscription = this.getInput$().subscribe(async () => {
      const savedObjectId = (this.getInput() as BookByReferenceInput).savedObjectId;
      const attributes = (this.getInput() as BookByValueInput).attributes;
      if (this.attributes !== attributes || this.savedObjectId !== savedObjectId) {
        this.savedObjectId = savedObjectId;
        this.reload();
      } else {
        this.updateOutput({
          attributes: this.attributes,
          hasMatch: getHasMatch(this.input.search, this.attributes),
        });
      }
    });
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<BookEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    this.attributes = await this.attributeService.unwrapAttributes(this.input);

    this.updateOutput({
      attributes: this.attributes,
      hasMatch: getHasMatch(this.input.search, this.attributes),
    });
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
