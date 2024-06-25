/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiSpacer,
  EuiLink,
  EuiEmptyPrompt,
  EuiTextArea,
  EuiFormRow,
  EuiSelect,
  EuiColorPicker,
  useColorPickerState,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { FilePicker } from '@kbn/shared-ux-file-picker';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { FileImageMetadata, imageEmbeddableFileKind } from '../../imports';
import { ImageConfig } from '../../types';
import { ImageViewer } from '../image_viewer/image_viewer'; // use eager version to avoid flickering
import { validateImageConfig, DraftImageConfig } from '../../utils/validate_image_config';
import { useImageViewerContext } from '../image_viewer/image_viewer_context';

/**
 * Shared sizing css for image, upload placeholder, empty and not found state
 * Makes sure the container has not too large height to preserve vertical space for the image configuration in the flyout
 */
const CONTAINER_SIZING_CSS = css({
  aspectRatio: `21 / 9`,
  width: `100%`,
  height: `auto`,
  maxHeight: `max(20vh, 180px)`,
});

export interface ImageEditorFlyoutProps {
  onCancel: () => void;
  onSave: (imageConfig: ImageConfig) => void;
  initialImageConfig?: ImageConfig;
  user?: AuthenticatedUser;
}

export function ImageEditorFlyout(props: ImageEditorFlyoutProps) {
  const isEditing = !!props.initialImageConfig;
  const { euiTheme } = useEuiTheme();
  const { validateUrl } = useImageViewerContext();

  const [fileId, setFileId] = useState<undefined | string>(() =>
    props.initialImageConfig?.src?.type === 'file' ? props.initialImageConfig.src.fileId : undefined
  );
  const [fileImageMeta, setFileImageMeta] = useState<undefined | FileImageMetadata>(() =>
    props.initialImageConfig?.src?.type === 'file'
      ? props.initialImageConfig.src.fileImageMeta
      : undefined
  );
  const [srcType, setSrcType] = useState<ImageConfig['src']['type']>(
    () => props.initialImageConfig?.src?.type ?? 'file'
  );
  const [srcUrl, setSrcUrl] = useState<string>(() =>
    props.initialImageConfig?.src?.type === 'url' ? props.initialImageConfig.src.url : ''
  );
  const [srcUrlError, setSrcUrlError] = useState<string | null>(() => {
    if (srcUrl) return validateUrl(srcUrl)?.error ?? null;
    return null;
  });
  const [isFilePickerOpen, setIsFilePickerOpen] = useState<boolean>(false);
  const [sizingObjectFit, setSizingObjectFit] = useState<ImageConfig['sizing']['objectFit']>(
    () => props.initialImageConfig?.sizing?.objectFit ?? 'contain'
  );
  const [altText, setAltText] = useState<string>(() => props.initialImageConfig?.altText ?? '');
  const [color, setColor, colorErrors] = useColorPickerState(
    props?.initialImageConfig?.backgroundColor
  );
  const isColorInvalid = !!color && !!colorErrors;

  const draftImageConfig: DraftImageConfig = {
    ...props.initialImageConfig,
    src:
      srcType === 'url'
        ? {
            type: 'url',
            url: srcUrl,
          }
        : { type: 'file', fileId, fileImageMeta },
    altText,
    backgroundColor: colorErrors ? undefined : color,
    sizing: {
      objectFit: sizingObjectFit,
    },
  };

  const isDraftImageConfigValid = validateImageConfig(draftImageConfig, {
    validateUrl,
  });

  const onSave = () => {
    if (!isDraftImageConfigValid) return;
    props.onSave(draftImageConfig);
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {isEditing ? (
              <FormattedMessage
                id="imageEmbeddable.imageEditor.editImagetitle"
                defaultMessage="Edit image"
              />
            ) : (
              <FormattedMessage
                id="imageEmbeddable.imageEditor.addImagetitle"
                defaultMessage="Add image"
              />
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiTabs style={{ marginBottom: '-25px' }}>
          <EuiTab onClick={() => setSrcType('file')} isSelected={srcType === 'file'}>
            <FormattedMessage
              id="imageEmbeddable.imageEditor.uploadTabLabel"
              defaultMessage="Upload"
            />
          </EuiTab>
          <EuiTab onClick={() => setSrcType('url')} isSelected={srcType === 'url'}>
            <FormattedMessage
              id="imageEmbeddable.imageEditor.useLinkTabLabel"
              defaultMessage="Use link"
            />
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {srcType === 'file' && (
          <>
            {isDraftImageConfigValid ? (
              <ImageViewer
                css={CONTAINER_SIZING_CSS}
                imageConfig={draftImageConfig}
                onChange={() => setIsFilePickerOpen(true)}
                onClear={() => {
                  setFileId(undefined);
                  setFileImageMeta(undefined);
                }}
                containerCSS={css`
                  border: ${euiTheme.border.thin};
                  background-color: ${euiTheme.colors.lightestShade};
                `}
              />
            ) : (
              <EuiFormRow
                fullWidth={true}
                css={css`
                  .lazy-load-fallback,
                  .euiFilePicker__prompt {
                    // increase upload image prompt size and lazy load fallback container to look nicer with large flyout and reduce layout shift
                    height: auto;
                    ${CONTAINER_SIZING_CSS};
                  }

                  .lazy-load-fallback {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                `}
              >
                <>
                  <FileUpload
                    kind={imageEmbeddableFileKind.id}
                    onDone={(files) => setFileId(files[0]?.id)}
                    immediate={true}
                    initialPromptText={i18n.translate(
                      'imageEmbeddable.imageEditor.uploadImagePromptText',
                      {
                        defaultMessage: 'Select or drag and drop an image',
                      }
                    )}
                    fullWidth={true}
                    lazyLoadFallback={
                      <div className={`lazy-load-fallback`}>
                        <EuiLoadingSpinner size={'xl'} />
                      </div>
                    }
                  />
                  <p style={{ textAlign: 'center' }}>
                    <EuiLink
                      onClick={() => setIsFilePickerOpen(true)}
                      data-test-subj="imageEmbeddableEditorSelectFiles"
                    >
                      <FormattedMessage
                        id="imageEmbeddable.imageEditor.selectImagePromptText"
                        defaultMessage="Use a previously uploaded image"
                      />
                    </EuiLink>
                  </p>
                </>
              </EuiFormRow>
            )}
          </>
        )}
        {srcType === 'url' && (
          <>
            {!isDraftImageConfigValid ? (
              <EuiEmptyPrompt
                css={css`
                  max-inline-size: none !important;
                `}
                iconType="image"
                color="subdued"
                title={
                  <p>
                    <FormattedMessage
                      id="imageEmbeddable.imageEditor.byURLNoImageTitle"
                      defaultMessage="No Image"
                    />
                  </p>
                }
                titleSize={'s'}
              />
            ) : (
              <ImageViewer
                css={CONTAINER_SIZING_CSS}
                imageConfig={draftImageConfig}
                onError={() => {
                  setSrcUrlError(
                    i18n.translate('imageEmbeddable.imageEditor.urlFailedToLoadImageErrorMessage', {
                      defaultMessage: 'Unable to load image.',
                    })
                  );
                }}
                containerCSS={css`
                  border: ${euiTheme.border.thin};
                  background-color: ${euiTheme.colors.lightestShade};
                `}
              />
            )}

            <EuiSpacer />
            <EuiFormRow
              label={
                <FormattedMessage
                  id="imageEmbeddable.imageEditor.imageURLInputLabel"
                  defaultMessage="Link to image"
                />
              }
              helpText={
                <FormattedMessage
                  id="imageEmbeddable.imageEditor.imageURLHelpText"
                  defaultMessage="Supported file types: png, jpeg, webp, and avif."
                />
              }
              fullWidth={true}
              isInvalid={!!srcUrlError}
              error={srcUrlError}
            >
              <EuiTextArea
                data-test-subj={'imageEmbeddableEditorUrlInput'}
                fullWidth
                compressed={true}
                placeholder={i18n.translate('imageEmbeddable.imageEditor.imageURLPlaceholderText', {
                  defaultMessage: 'Example: https://elastic.co/my-image.png',
                })}
                value={srcUrl}
                onChange={(e) => {
                  const url = e.target.value;

                  const { isValid, error } = validateUrl(url);
                  if (!isValid) {
                    setSrcUrlError(error!);
                  } else {
                    setSrcUrlError(null);
                  }

                  setSrcUrl(e.target.value);
                }}
              />
            </EuiFormRow>
          </>
        )}
        <EuiSpacer />
        <EuiFormRow
          label={
            <FormattedMessage
              id="imageEmbeddable.imageEditor.imageFillModeLabel"
              defaultMessage="Fill mode"
            />
          }
          fullWidth
        >
          <EuiSelect
            fullWidth
            options={[
              {
                value: 'contain',
                text: i18n.translate('imageEmbeddable.imageEditor.imageFillModeContainOptionText', {
                  defaultMessage: 'Fit maintaining aspect ratio',
                }),
              },
              {
                value: 'cover',
                text: i18n.translate('imageEmbeddable.imageEditor.imageFillModeCoverOptionText', {
                  defaultMessage: 'Fill maintaining aspect ratio',
                }),
              },
              {
                value: 'fill',
                text: i18n.translate('imageEmbeddable.imageEditor.imageFillModeFillOptionText', {
                  defaultMessage: 'Stretch to fill',
                }),
              },
              {
                value: 'none',
                text: i18n.translate('imageEmbeddable.imageEditor.imageFillModeNoneOptionText', {
                  defaultMessage: "Don't resize",
                }),
              },
            ]}
            value={sizingObjectFit}
            onChange={(e) =>
              setSizingObjectFit(e.target.value as ImageConfig['sizing']['objectFit'])
            }
          />
        </EuiFormRow>
        <EuiSpacer />

        <EuiFormRow
          label={
            <FormattedMessage
              id="imageEmbeddable.imageEditor.imageBackgroundColorLabel"
              defaultMessage="Background color"
            />
          }
          fullWidth
          isInvalid={isColorInvalid}
          error={colorErrors}
        >
          <EuiColorPicker
            fullWidth
            onChange={setColor}
            color={color}
            isInvalid={isColorInvalid}
            isClearable={true}
            placeholder={i18n.translate(
              'imageEmbeddable.imageEditor.imageBackgroundColorPlaceholderText',
              {
                defaultMessage: 'Transparent',
              }
            )}
          />
        </EuiFormRow>

        <EuiSpacer />
        <EuiFormRow
          label={
            <FormattedMessage
              id="imageEmbeddable.imageEditor.imageBackgroundDescriptionLabel"
              defaultMessage="Description"
            />
          }
          fullWidth
        >
          <EuiTextArea
            data-test-subj={'imageEmbeddableEditorAltInput'}
            fullWidth
            compressed={true}
            value={altText}
            maxLength={1000}
            placeholder={i18n.translate(
              'imageEmbeddable.imageEditor.imageAltInputPlaceholderText',
              {
                defaultMessage: `Alt text that describes the image`,
              }
            )}
            onChange={(e) => {
              setAltText(e.target.value);
            }}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={props.onCancel} flush="left">
              <FormattedMessage
                id="imageEmbeddable.imageEditor.imageBackgroundCloseButtonText"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSave}
              fill
              isDisabled={!isDraftImageConfigValid}
              data-test-subj="imageEmbeddableEditorSave"
            >
              <FormattedMessage
                id="imageEmbeddable.imageEditor.imageBackgroundSaveImageButtonText"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {isFilePickerOpen && (
        <FilePicker
          kind={imageEmbeddableFileKind.id}
          shouldAllowDelete={(file) =>
            props.user ? props.user.profile_uid === file.user?.id : false
          }
          multiple={false}
          onClose={() => {
            setIsFilePickerOpen(false);
          }}
          onDone={([file]) => {
            setFileId(file.id);
            setFileImageMeta(file.meta as FileImageMetadata);
            setIsFilePickerOpen(false);
          }}
        />
      )}
    </>
  );
}
