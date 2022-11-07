/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { i18n } from '@kbn/i18n';
import React from 'react';
import { Image } from '@kbn/files-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { ImageEmbeddableInput } from './image_embeddable_factory';

export const IMAGE_EMBEDDABLE_TYPE = 'IMAGE_EMBEDDABLE';

export class ImageEmbeddable extends Embeddable<ImageEmbeddableInput> {
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(
    private deps: { getImageDownloadHref: (fileId: string) => string },
    initialInput: ImageEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        editable: true,
        editableWithExplicitInput: true,
      },
      parent
    );
  }

  public render() {
    const ImageEmbeddableViewer = (props: { embeddable: ImageEmbeddable }) => {
      const input = useObservable(props.embeddable.getInput$(), props.embeddable.getInput());

      return (
        <div data-test-subj="imageEmbeddable" data-render-complete="true">
          {input.imageConfig.src.type === 'file' && (
            <Image
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              src={this.deps.getImageDownloadHref(input.imageConfig.src.fileId)}
              alt={input.imageConfig.alt ?? ''}
            />
          )}
        </div>
      );
    };

    return <ImageEmbeddableViewer embeddable={this} />;
  }

  public reload() {}
}
