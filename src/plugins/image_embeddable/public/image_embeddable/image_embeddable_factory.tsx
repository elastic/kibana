/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IExternalUrl } from '@kbn/core-http-browser';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  ApplicationStart,
  OverlayStart,
  FilesClient,
  FileImageMetadata,
  imageEmbeddableFileKind,
  ThemeServiceStart,
} from '../imports';
import { ImageEmbeddable, IMAGE_EMBEDDABLE_TYPE } from './image_embeddable';
import { ImageConfig } from '../types';
import { createValidateUrl } from '../utils/validate_url';

export interface ImageEmbeddableFactoryDeps {
  start: () => {
    application: ApplicationStart;
    overlays: OverlayStart;
    files: FilesClient<FileImageMetadata>;
    externalUrl: IExternalUrl;
    theme: ThemeServiceStart;
  };
}

export interface ImageEmbeddableInput extends EmbeddableInput {
  imageConfig: ImageConfig;
}

export class ImageEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<ImageEmbeddableInput>
{
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(private deps: ImageEmbeddableFactoryDeps) {}

  public async isEditable() {
    return Boolean(this.deps.start().application.capabilities.dashboard?.showWriteControls);
  }

  public async create(initialInput: ImageEmbeddableInput, parent?: IContainer) {
    return new ImageEmbeddable(
      {
        getImageDownloadHref: this.getImageDownloadHref,
        validateUrl: createValidateUrl(this.deps.start().externalUrl),
      },
      initialInput,
      parent
    );
  }

  public getDisplayName() {
    return i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName', {
      defaultMessage: 'Image',
    });
  }

  public getIconType() {
    return `image`;
  }

  public async getExplicitInput(initialInput: ImageEmbeddableInput) {
    const { configureImage } = await import('../image_editor');

    const imageConfig = await configureImage(
      {
        files: this.deps.start().files,
        overlays: this.deps.start().overlays,
        currentAppId$: this.deps.start().application.currentAppId$,
        validateUrl: createValidateUrl(this.deps.start().externalUrl),
        getImageDownloadHref: this.getImageDownloadHref,
        theme: this.deps.start().theme,
      },
      initialInput ? initialInput.imageConfig : undefined
    );

    return { imageConfig };
  }

  private getImageDownloadHref = (fileId: string) =>
    this.deps.start().files.getDownloadHref({ id: fileId, fileKind: imageEmbeddableFileKind.id });
}
