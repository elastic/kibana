/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import type { TileMapOptionsProps } from './tile_map_options';

const TileMapOptions = lazy(() => import('./tile_map_options'));

export const TileMapOptionsLazy = (props: TileMapOptionsProps) => <TileMapOptions {...props} />;
