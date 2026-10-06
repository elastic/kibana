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
export declare const useShareTypeContext: <T extends Exclude<ShareTypes, 'legacy'>, G extends T extends 'integration' ? string : never>(shareType: T, groupId?: G) => {
    objectType: string;
    objectTypeAlias?: string;
    objectId?: string;
    shareableUrl?: string;
    shareableUrlForSavedObject?: string;
    shareableUrlLocatorParams?: {
        locator: import("../..").LocatorPublic<import("@kbn/utility-types").SerializableRecord>;
        params: import("@kbn/utility-types").SerializableRecord;
    };
    sharingData: import("../..").SharingData<import("@kbn/utility-types").SerializableRecord> & Record<string, unknown>;
    isDirty: boolean;
    asExport?: boolean;
    anchorElement?: HTMLElement;
    allowShortUrl: boolean;
    publicAPIEnabled?: boolean;
    onSave?: () => Promise<void>;
    onClose: () => void;
    isSaving?: boolean;
    objectTypeMeta: Omit<Partial<{
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
        link: import("../../types").LinkShareUIConfig;
    }>, "config"> & {
        config: T extends 'integration' ? NonNullable<NonNullable<Partial<{
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
            link: import("../../types").LinkShareUIConfig;
        }>>['integration']>[G] | undefined : Exclude<NonNullable<Partial<{
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
            link: import("../../types").LinkShareUIConfig;
        }>>, 'integration'>[T];
    };
    shareMenuItems: T extends "integration" ? (Extract<import("../../types").EmbedShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../..").ExportShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").ExportShareDerivativesConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").LegacyIntegrationConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").LinkShareConfig, {
        shareType: T;
        groupId?: G;
    }> | Extract<import("../../types").ShareIntegrationConfig, {
        shareType: T;
        groupId?: G;
    }>)[] : Extract<import("../../types").EmbedShareConfig, {
        shareType: T;
    }> | Extract<import("../..").ExportShareConfig, {
        shareType: T;
    }> | Extract<import("../../types").ExportShareDerivativesConfig, {
        shareType: T;
    }> | Extract<import("../../types").LegacyIntegrationConfig, {
        shareType: T;
    }> | Extract<import("../../types").LinkShareConfig, {
        shareType: T;
    }> | Extract<import("../../types").ShareIntegrationConfig, {
        shareType: T;
    }>;
};
