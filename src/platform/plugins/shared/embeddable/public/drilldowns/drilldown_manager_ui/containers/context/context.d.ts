import type { PropsWithChildren } from 'react';
import React from 'react';
import type { DrilldownsManagerDeps } from '../../state';
import { DrilldownsManager } from '../../state';
export declare const useDrilldownsManager: () => DrilldownsManager;
export type DrilldownsManagerProviderProps = DrilldownsManagerDeps;
export declare const DrilldownManagerProvider: React.FC<PropsWithChildren<DrilldownsManagerProviderProps>>;
