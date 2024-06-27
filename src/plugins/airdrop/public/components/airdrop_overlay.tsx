/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { AirdropService } from '../airdrop_service';

interface Props {
  airdropService: AirdropService;
}

export const AirdropOverlay: FC<Props> = ({ airdropService }) => {
  const isDraggingOver = useObservable(airdropService.isDraggingOver$, false);

  return (
    <>
      {isDraggingOver && (
        <div
          css={{
            backgroundColor: 'rgba(0, 119, 204, 0.3)',
            height: '100vh',
            left: 0,
            position: 'absolute',
            top: 0,
            transform: 'translateY(-100%)',
            width: '100%',
            zIndex: 1,
          }}
        />
      )}
    </>
  );
};
