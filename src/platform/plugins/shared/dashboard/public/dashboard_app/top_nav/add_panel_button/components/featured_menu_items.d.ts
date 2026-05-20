import type { IconType } from '@elastic/eui';
export declare const FeaturedActionIds: readonly ["addLensPanelAction", "ACTION_CREATE_ESQL_CHART"];
export declare const FeaturedItems: Readonly<{
    [Key in (typeof FeaturedActionIds)[number]]: {
        title: string;
        description: string;
        icon: IconType;
    };
}>;
