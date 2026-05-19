import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
export type UiSetting = ExpressionValueBoxed<'ui_setting', {
    key: string;
    value: unknown;
}>;
export declare const uiSetting: ExpressionTypeDefinition<'ui_setting', UiSetting>;
