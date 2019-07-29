import { IDirective, IScope } from 'angular';
import { I18nServiceType } from './provider';
interface I18nScope extends IScope {
    values?: Record<string, any>;
    defaultMessage: string;
    id: string;
}
export declare function i18nDirective(i18n: I18nServiceType, $sanitize: (html: string) => string): IDirective<I18nScope>;
export {};
//# sourceMappingURL=directive.d.ts.map