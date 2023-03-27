/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { ImageEmbeddableInput } from './image_embeddable_factory';
import { ImageViewer, ImageViewerContext } from '../image_viewer';
import { createValidateUrl } from '../utils/validate_url';
import { imageClickTrigger, ImageClickContext } from '../actions';

export const IMAGE_EMBEDDABLE_TYPE = 'image';

export class ImageEmbeddable extends Embeddable<ImageEmbeddableInput> {
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  supportedTriggers(): string[] {
    return [imageClickTrigger.id];
  }

  constructor(
    private deps: {
      getImageDownloadHref: (fileId: string) => string;
      validateUrl: ReturnType<typeof createValidateUrl>;
      actions: {
        executeTriggerActions: (triggerId: string, context: ImageClickContext) => void;
        hasTriggerActions: (triggerId: string, context: ImageClickContext) => Promise<boolean>;
      };
    },
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

  public render(el: HTMLElement) {
    super.render(el); // calling super.render initializes renderComplete and setTitle
    el.setAttribute('data-shared-item', '');
    const ImageEmbeddableViewer = this.ImageEmbeddableViewer;
    return <ImageEmbeddableViewer embeddable={this} />;
  }

  public reload() {}

  private ImageEmbeddableViewer = (props: { embeddable: ImageEmbeddable }) => {
    const input = useObservable(props.embeddable.getInput$(), props.embeddable.getInput());

    React.useLayoutEffect(() => {
      import('./image_embeddable_lazy');
    }, []);

    const [hasTriggerActions, setHasTriggerActions] = React.useState(false);
    React.useEffect(() => {
      let cancel = false;

      // hack: timeout to give a chance for a drilldown action to be registered just after it is created by user
      setTimeout(() => {
        if (cancel) return;
        this.deps.actions
          .hasTriggerActions(imageClickTrigger.id, { embeddable: this })
          .catch(() => false)
          .then((hasActions) => !cancel && setHasTriggerActions(hasActions));
      }, 0);
      return () => {
        cancel = true;
      };
    });

    return (
      <ImageViewerContext.Provider
        value={{
          getImageDownloadHref: this.deps.getImageDownloadHref,
          validateUrl: this.deps.validateUrl,
        }}
      >
        <ImageViewer
          className="imageEmbeddableImage"
          imageConfig={input.imageConfig}
          onLoad={() => {
            this.renderComplete.dispatchComplete();
          }}
          onError={() => {
            this.renderComplete.dispatchError();
          }}
          onClick={
            // note: passing onClick enables the cursor pointer style, so we only pass it if there are compatible actions
            hasTriggerActions
              ? () => {
                  this.deps.actions.executeTriggerActions(imageClickTrigger.id, {
                    embeddable: this,
                  });
                }
              : undefined
          }
        />
      </ImageViewerContext.Provider>
    );
  };
}
