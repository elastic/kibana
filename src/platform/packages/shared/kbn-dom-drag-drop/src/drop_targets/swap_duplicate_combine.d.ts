import React from 'react';
import type { DropType } from '../types';
export declare const getCustomDropTarget: (dropType: DropType) => React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export declare const getAdditionalClassesOnEnter: (dropType?: string) => "domDroppable--replacing" | undefined;
export declare const getAdditionalClassesOnDroppable: (dropType?: string) => "domDroppable--incompatible" | undefined;
