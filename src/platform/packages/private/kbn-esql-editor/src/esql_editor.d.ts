import type { ComponentProps } from 'react';
import React from 'react';
import type { ESQLEditorProps as ESQLEditorPropsInternal } from './types';
declare const ESQLEditorWithState: React.ForwardRefExoticComponent<ESQLEditorPropsInternal & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<import("./restorable_state").ESQLEditorRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
export declare const ESQLEditor: (props: ComponentProps<typeof ESQLEditorWithState>) => React.JSX.Element;
export type ESQLEditorProps = ComponentProps<typeof ESQLEditor>;
export {};
