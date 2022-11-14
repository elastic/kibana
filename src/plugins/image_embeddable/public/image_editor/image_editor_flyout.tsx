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
  RecursivePartial,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FilePicker, UploadFile } from '@kbn/files-plugin/public';
import { i18n } from '@kbn/i18n';
import { ImageConfig } from '../types';
import { imageEmbeddableFileKind } from '../../common';
import { ImageViewer } from '../image_viewer';

export interface ImageEditorFlyoutProps {
  onCancel: () => void;
  onSave: (imageConfig: ImageConfig) => void;
  initialImageConfig?: ImageConfig;
}

type DraftImageConfig = RecursivePartial<ImageConfig>;
function isImageConfigValid(
  draftConfig: DraftImageConfig,
  { srcUrlError }: { srcUrlError: string | null }
): draftConfig is ImageConfig {
  if (!draftConfig.src) return false;
  if (draftConfig.src.type === 'file') {
    if (!draftConfig.src.fileId) return false;
  } else if (draftConfig.src.type === 'url') {
    if (!draftConfig.src.url) return false;
    // if (srcUrlError) return false;
    if (!validateUrl(draftConfig.src.url).isValid) return false;
  }

  return true;
}

export function ImageEditorFlyout(props: ImageEditorFlyoutProps) {
  const [fileId, setFileId] = useState<undefined | string>(() =>
    props.initialImageConfig?.src?.type === 'file' ? props.initialImageConfig.src.fileId : undefined
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
        : { type: 'file', fileId },
    altText,
    backgroundColor: colorErrors ? undefined : color,
    sizing: {
      objectFit: sizingObjectFit,
    },
  };

  const isDraftImageConfigValid = isImageConfigValid(draftImageConfig, { srcUrlError });

  const onSave = () => {
    if (!isDraftImageConfigValid) return;
    props.onSave(draftImageConfig);
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>Configure Image</h2>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiTabs style={{ marginBottom: '-25px' }}>
          <EuiTab onClick={() => setSrcType('file')} isSelected={srcType === 'file'}>
            Upload
          </EuiTab>
          <EuiTab onClick={() => setSrcType('url')} isSelected={srcType === 'url'}>
            By URL
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {srcType === 'file' && (
          <>
            {isDraftImageConfigValid ? (
              <ImageViewer
                imageConfig={draftImageConfig}
                onChange={() => setIsFilePickerOpen(true)}
                onClear={() => {
                  setFileId(undefined);
                }}
              />
            ) : (
              <EuiFormRow
                fullWidth={true}
                css={`
                  .lazy-load-fallback,
                  .euiFilePicker__prompt {
                    // increase upload image prompt size and lazy load fallback container to look nicer with large flyout and reduce layout shift
                    height: auto;
                    aspect-ratio: 16 / 9;
                  }

                  .lazy-load-fallback {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                `}
              >
                <>
                  <UploadFile
                    kind={imageEmbeddableFileKind.id}
                    onDone={(files) => setFileId(files[0]?.id)}
                    immediate={true}
                    initialPromptText={'Upload a new image'}
                    fullWidth={true}
                    lazyLoadFallback={
                      <div className={`lazy-load-fallback`}>
                        <EuiLoadingSpinner size={'xl'} />
                      </div>
                    }
                  />
                  <p style={{ textAlign: 'center' }}>
                    <EuiLink onClick={() => setIsFilePickerOpen(true)}>
                      Or select from previously uploaded images
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
                css={`
                  max-width: none;
                  aspect-ratio: 16/9;
                  .euiEmptyPrompt__main {
                    height: 100%;
                  }
                `}
                iconType="image"
                color="subdued"
                title={<h3>No Image</h3>}
                titleSize={'s'}
                body={<p>Insert a valid URL to the image in the text field below.</p>}
              />
            ) : (
              <ImageViewer
                imageConfig={draftImageConfig}
                onError={() => {
                  setSrcUrlError(failedToLoadImageFromURL(srcUrl));
                }}
              />
            )}

            <EuiSpacer />
            <EuiFormRow
              label={'Insert a URL to the image'}
              helpText="Example: https://elastic.co/my-image.png"
              fullWidth={true}
              isInvalid={!!srcUrlError}
              error={srcUrlError}
            >
              <EuiTextArea
                fullWidth
                compressed={true}
                placeholder="Example: https://elastic.co/my-image.png"
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
          label={`Sizing`}
          helpText={`How the image should be resized to fit its container.`}
          fullWidth
        >
          <EuiSelect
            fullWidth
            options={[
              { value: 'contain', text: 'Fit maintaining aspect ratio' },
              { value: 'cover', text: 'Fill maintaining aspect ratio' },
              { value: 'fill', text: 'Stretch to fill' },
              { value: 'none', text: "Don't resize" },
            ]}
            value={sizingObjectFit}
            onChange={(e) =>
              setSizingObjectFit(e.target.value as ImageConfig['sizing']['objectFit'])
            }
          />
        </EuiFormRow>
        <EuiSpacer />

        <EuiFormRow
          label="Background color"
          helpText={
            "The background is visible if the image is transparent or if it doesn't completely fill its container."
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
            placeholder={'Default'}
          />
        </EuiFormRow>

        <EuiSpacer />
        <EuiFormRow
          label={`Description`}
          helpText={`Screen readers read this description out to their users so they know what the image means. This text is also displayed if the image can't be loaded.`}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            compressed={true}
            value={altText}
            maxLength={1000}
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
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill disabled={!isDraftImageConfigValid}>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {isFilePickerOpen && (
        <FilePicker
          kind={imageEmbeddableFileKind.id}
          multiple={false}
          onClose={() => {
            setIsFilePickerOpen(false);
          }}
          onDone={(fileIds) => {
            setFileId(fileIds[0]);
            setIsFilePickerOpen(false);
          }}
        />
      )}
    </>
  );
}

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto):|[^&:/?#]*(?:[/?#]|$))/gi;
const generalFormatError = i18n.translate(
  'imageEmbeddable.imageEditor.urlFormatGeneralErrorMessage',
  {
    defaultMessage: 'Invalid format. Example: {exampleUrl}',
    values: {
      exampleUrl: 'https://elastic.co/my-image.png',
    },
  }
);
const failedToLoadImageFromURL = (url: string) =>
  i18n.translate('imageEmbeddable.imageEditor.urlFailedToLoadImageErrorMessage', {
    defaultMessage: 'Failed to load image from URL "{url}".',
    values: {
      url,
    },
  });
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url)
    return {
      isValid: false,
      error: generalFormatError,
    };

  try {
    new URL(url);
    if (!url.match(SAFE_URL_PATTERN)) throw new Error();
    return { isValid: true };
  } catch (e) {
    return {
      isValid: false,
      error: generalFormatError,
    };
  }
}
