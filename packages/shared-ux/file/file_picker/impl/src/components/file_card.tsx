/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { FunctionComponent } from 'react';
import numeral from '@elastic/numeral';
import useObservable from 'react-use/lib/useObservable';
import { EuiCard, EuiText, EuiIcon, useEuiTheme, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { FileJSON } from '@kbn/shared-ux-file-types';
import { isImage } from '@kbn/shared-ux-file-util';
import { FileImage as Image } from '@kbn/shared-ux-file-image';
import type { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { useFilePickerContext } from '../context';
import { i18nTexts } from '../i18n_texts';

import './file_card.scss';

interface Props {
  file: FileJSON;
}

export const FileCard: FunctionComponent<Props> = ({ file }) => {
  const { kind, state, client, shouldAllowDelete } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const displayImage = isImage({ type: file.mimeType });
  const isSelected$ = useMemo(() => state.watchFileSelected$(file.id), [file.id, state]);
  const isSelected = useObservable(isSelected$, false);

  const imageHeight = `calc(${euiTheme.size.xxxl} * 2)`;

  const image = (
    <div
      css={css`
        display: grid;
        place-items: center;
        height: ${imageHeight};
        margin: ${euiTheme.size.m};
      `}
    >
      {displayImage ? (
        <Image
          alt={file.alt ?? ''}
          css={css`
            max-height: ${imageHeight};
          `}
          meta={file.meta as FileImageMetadata}
          src={client.getDownloadHref({ id: file.id, fileKind: kind })}
          loading={'lazy'}
        />
      ) : (
        <div
          css={css`
            display: grid;
            place-items: center;
            height: ${imageHeight};
          `}
        >
          <EuiIcon type="filebeatApp" size="xl" />
        </div>
      )}
    </div>
  );

  const description = (
    <>
      <EuiText
        size="s"
        css={css`
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        <strong>{file.name}</strong>
      </EuiText>
      <EuiText color="subdued" size="xs">
        {numeral(file.size).format('0[.]0 b')}
        {file.extension && (
          <>
            &nbsp; &#183; &nbsp;
            <span
              css={css`
                text-transform: uppercase;
              `}
            >
              {file.extension}
            </span>
          </>
        )}
      </EuiText>
    </>
  );

  const deleteButton = shouldAllowDelete && shouldAllowDelete(file) && (
    <EuiButtonIcon
      iconType="trash"
      aria-label={i18nTexts.delete}
      color="danger"
      css={{
        position: 'absolute',
        right: `${euiTheme.size.s}`,
        top: `${euiTheme.size.s}`,
        display: 'none',
      }}
      onClick={() => state.showDeletePrompt(file)}
    />
  );

  return (
    <div css={{ position: 'relative', '&:hover > button': { display: 'block' } }}>
      <EuiCard
        title=""
        css={css`
          place-self: stretch;
          > * {
            // TODO: Once content no longer overflows card remove, i.e. once on @elastic/eui ^70.3.0
            width: 100%;
          }
        `}
        paddingSize="s"
        selectable={{
          isSelected,
          onClick: () => (isSelected ? state.unselectFile(file.id) : state.selectFile(file)),
        }}
        image={image}
        description={description}
        hasBorder
      />
      {deleteButton}
    </div>
  );
};
