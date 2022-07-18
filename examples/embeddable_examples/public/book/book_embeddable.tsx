/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  ReferenceOrValueEmbeddable,
  AttributeService,
} from '@kbn/embeddable-plugin/public';
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

export class BookEmbeddable
  extends Embeddable<BookEmbeddableInput, BookEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<BookByValueInput, BookByReferenceInput>
{
  public readonly type = BOOK_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectId?: string;
  private attributes?: BookSavedObjectAttributes;

  constructor(
    initialInput: BookEmbeddableInput,
    private attributeService: AttributeService<BookSavedObjectAttributes>,
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
          defaultTitle: this.attributes.title,
          hasMatch: getHasMatch(this.input.search, this.attributes),
        });
      }
    });
  }

  readonly inputIsRefType = (input: BookEmbeddableInput): input is BookByReferenceInput => {
    return this.attributeService.inputIsRefType(input);
  };

  readonly getInputAsValueType = async (): Promise<BookByValueInput> => {
    return this.attributeService.getInputAsValueType(this.getExplicitInput());
  };

  readonly getInputAsRefType = async (): Promise<BookByReferenceInput> => {
    return this.attributeService.getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  };

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<BookEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    this.attributes = (await this.attributeService.unwrapAttributes(this.input)).attributes;

    this.updateOutput({
      attributes: this.attributes,
      defaultTitle: this.attributes.title,
      hasMatch: getHasMatch(this.input.search, this.attributes),
    });
  }

  public getTitle() {
    return this.getOutput()?.title || this.getOutput().attributes?.title;
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
