import React, { type PropsWithChildren } from 'react';
import type { ShareConfigs, ShareTypes, ShowShareMenuOptions } from '../../types';
export interface IShareContext extends Omit<ShowShareMenuOptions, 'onClose'> {
    onClose: () => void;
    shareMenuItems: ShareConfigs[];
    isSaving?: boolean;
}
export declare const ShareProvider: ({ shareContext, children, }: PropsWithChildren<{
    shareContext: IShareContext;
}>) => React.JSX.Element;
export declare const useShareContext: () => IShareContext;
export declare const useShareTypeContext: <T extends Exclude<ShareTypes, "legacy">, G extends T extends "integration" ? string : never>(shareType: T, groupId?: G) => {
    objectTypeMeta: Omit<Partial<{
        link: import("../../types").LinkShareUIConfig;
        embed: import("../../types").EmbedShareUIConfig;
        integration: {
            [key: string]: {
                draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                helpText?: React.ReactNode;
                CTAButtonConfig?: {
                    id: string;
                    dataTestSubj: string;
                    label: string;
                };
                disabled?: boolean;
            } & Record<string, unknown>;
            export: {
                [x: string]: {
                    draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                    helpText?: React.ReactNode;
                    CTAButtonConfig?: {
                        id: string;
                        dataTestSubj: string;
                        label: string;
                    };
                    disabled?: boolean;
                };
            };
        };
    }>, "config"> & {
        config: T extends "integration" ? NonNullable<NonNullable<Partial<{
            link: import("../../types").LinkShareUIConfig;
            embed: import("../../types").EmbedShareUIConfig;
            integration: {
                [key: string]: {
                    draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                    helpText?: React.ReactNode;
                    CTAButtonConfig?: {
                        id: string;
                        dataTestSubj: string;
                        label: string;
                    };
                    disabled?: boolean;
                } & Record<string, unknown>;
                export: {
                    [x: string]: {
                        draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                        helpText?: React.ReactNode;
                        CTAButtonConfig?: {
                            id: string;
                            dataTestSubj: string;
                            label: string;
                        };
                        disabled?: boolean;
                    };
                };
            };
        }>>["integration"]>[G] | undefined : Exclude<NonNullable<Partial<{
            link: import("../../types").LinkShareUIConfig;
            embed: import("../../types").EmbedShareUIConfig;
            integration: {
                [key: string]: {
                    draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                    helpText?: React.ReactNode;
                    CTAButtonConfig?: {
                        id: string;
                        dataTestSubj: string;
                        label: string;
                    };
                    disabled?: boolean;
                } & Record<string, unknown>;
                export: {
                    [x: string]: {
                        draftModeCallOut?: boolean | import("../common/draft_mode_callout").DraftModeCalloutProps;
                        helpText?: React.ReactNode;
                        CTAButtonConfig?: {
                            id: string;
                            dataTestSubj: string;
                            label: string;
                        };
                        disabled?: boolean;
                    };
                };
            };
        }>>, "integration">[T];
    };
    shareMenuItems: T extends "integration" ? (Extract<import("../../types").ExportShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").LinkShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").EmbedShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").ExportShareDerivativesConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").ShareIntegrationConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").LegacyIntegrationConfig, {
        shareType: T;
        groupId?: G;
    }>)[] : Extract<import("../../types").ExportShareConfig, {
        shareType: T;
    }> | Extract<import("../../types").LinkShareConfig, {
        shareType: T;
    }> | Extract<import("../../types").EmbedShareConfig, {
        shareType: T;
    }> | Extract<import("../../types").ExportShareDerivativesConfig, {
        shareType: T;
    }> | Extract<import("../../types").ShareIntegrationConfig, {
        shareType: T;
    }> | Extract<import("../../types").LegacyIntegrationConfig, {
        shareType: T;
    }>;
    onClose: () => void;
    isSaving?: boolean;
    anchorElement?: HTMLElement | undefined;
    onSave?: (() => Promise<void>) | undefined;
    objectType: string;
    objectTypeAlias?: string | undefined;
    objectId?: string | undefined;
    shareableUrl?: string | undefined;
    shareableUrlForSavedObject?: string | undefined;
    shareableUrlLocatorParams?: {
        locator: import("../..").LocatorPublic<import("@kbn/utility-types").SerializableRecord>;
        params: import("../../types").ShareableLocatorParams;
    } | undefined;
    sharingData: import("../../types").SharingData<import("@kbn/utility-types").SerializableRecord> & Record<string, unknown>;
    isDirty: boolean;
    asExport?: boolean | undefined;
    allowShortUrl: boolean;
    publicAPIEnabled?: boolean | undefined;
};
