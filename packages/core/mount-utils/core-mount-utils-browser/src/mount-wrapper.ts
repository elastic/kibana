/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { MountPoint } from './mount_point';

/** @public {@link MountPoint} */
export interface MountWrapperComponentProps {
  mount: MountPoint;
  className?: string;
}

/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 * @public
 */
export type MountWrapperComponent = React.FunctionComponent<MountWrapperComponentProps>;
