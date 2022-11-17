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
import { useCurrentUser } from '../../../hooks/use_current_user';
import { FileImageMetadata, FileJSON } from '../../../../common';
import { Image } from '../../image';
import { isImage } from '../../util';
import { useFilePickerContext } from '../context';

import './file_card.scss';

export interface FileToBeDestroyed {
  id: string;
  name: string;
  kind: string;
}

interface Props {
  file: FileJSON;
  onClickDelete: (file: FileToBeDestroyed) => void;
}

export const FileCard: FunctionComponent<Props> = ({ file, onClickDelete }) => {
  const { kind, state, client } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const displayImage = isImage({ type: file.mimeType });
  const isSelected$ = useMemo(() => state.watchFileSelected$(file.id), [file.id, state]);
  const isSelected = useObservable(isSelected$, false);
  const currentUser = useCurrentUser();

  const isUserOwnFile = currentUser?.profile_uid === file.user?.id;
  const imageHeight = `calc(${euiTheme.size.xxxl} * 2)`;

  return (
    <div css={{ position: 'relative', '&:hover > button': { display: 'block' } }}>
      <EuiCard
        title=""
        css={css`
          place-self: stretch;
        `}
        paddingSize="s"
        selectable={{
          isSelected,
          onClick: () => (isSelected ? state.unselectFile(file.id) : state.selectFile(file)),
        }}
        image={
          <div
            css={css`
              display: grid;
              place-items: center;
              height: ${imageHeight};
              margin: ${euiTheme.size.m};
              margin-top: ${euiTheme.size.xl};
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
        }
        description={
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
        }
        hasBorder
      />
      {isUserOwnFile && (
        <EuiButtonIcon
          iconType="trash"
          aria-label="Delete"
          color="danger"
          css={{
            position: 'absolute',
            right: `${euiTheme.size.s}`,
            top: `${euiTheme.size.s}`,
            display: 'none',
          }}
          onClick={() => onClickDelete({ id: file.id, name: file.name, kind })}
        />
      )}
    </div>
  );
};
