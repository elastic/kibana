/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilePicker, EuiImage } from '@elastic/eui';

import type { InputProps } from '../types';
import { useServices } from '../services';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link ImageInput} component.
 */
export interface ImageInputProps extends InputProps<'image'> {
  /** Indicate if the image has changed from the saved setting in the UI. */
  hasChanged: boolean;
  /** Indicate if the image value is the default value in Kibana. */
  isDefaultValue: boolean;
}

const getImageAsBase64 = async (file: Blob): Promise<string | ArrayBuffer> => {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result!);
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
};

const errorMessage = i18n.translate('management.settings.field.imageChangeErrorMessage', {
  defaultMessage: 'Image could not be saved',
});

/**
 * Component for manipulating an `image` field.
 */
export const ImageInput = React.forwardRef<EuiFilePicker, ImageInputProps>(
  (
    {
      ariaDescribedBy,
      ariaLabel,
      id,
      isDisabled,
      isDefaultValue,
      onChange: onChangeProp,
      name,
      value,
      hasChanged,
    },
    ref
  ) => {
    const { showDanger } = useServices();

    const onChange = async (files: FileList | null) => {
      if (files === null || !files.length) {
        onChangeProp({ value: '' });
        return null;
      }

      const file = files[0];

      try {
        let base64Image = '';

        if (file instanceof File) {
          base64Image = String(await getImageAsBase64(file));
        }

        onChangeProp({ value: base64Image });
      } catch (err) {
        showDanger(errorMessage);
        onChangeProp({ value: '', error: errorMessage });
      }
    };

    const a11yProps = {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    };

    // TODO: this check will be a bug, if a default image is ever actually
    // defined in Kibana.
    if (value && !isDefaultValue && !hasChanged) {
      return <EuiImage allowFullScreen url={value} alt={name} {...a11yProps} />;
    } else {
      return (
        <EuiFilePicker
          accept=".jpg,.jpeg,.png"
          data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
          disabled={isDisabled}
          fullWidth
          {...{ onChange, ref, ...a11yProps }}
        />
      );
    }
  }
);
