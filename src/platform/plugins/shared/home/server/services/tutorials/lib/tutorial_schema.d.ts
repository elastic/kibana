import type { TypeOf } from '@kbn/config-schema';
declare const dashboardSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    isOverview: import("@kbn/config-schema").Type<boolean>;
    linkLabel: import("@kbn/config-schema").ConditionalType<true, string, string | undefined>;
}>;
export type DashboardSchema = TypeOf<typeof dashboardSchema>;
declare const artifactsSchema: import("@kbn/config-schema").ObjectType<{
    exportedFields: import("@kbn/config-schema").Type<Readonly<{} & {
        documentationUrl: string;
    }> | undefined>;
    dashboards: import("@kbn/config-schema").Type<Readonly<{
        linkLabel?: string | undefined;
    } & {
        id: string;
        isOverview: boolean;
    }>[]>;
    application: import("@kbn/config-schema").Type<Readonly<{} & {
        path: string;
        label: string;
    }> | undefined>;
}>;
export type ArtifactsSchema = TypeOf<typeof artifactsSchema>;
declare const statusCheckSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    text: import("@kbn/config-schema").Type<string | undefined>;
    btnLabel: import("@kbn/config-schema").Type<string | undefined>;
    success: import("@kbn/config-schema").Type<string | undefined>;
    error: import("@kbn/config-schema").Type<string | undefined>;
    esHitsCheck: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | string[]>;
        query: import("@kbn/config-schema").Type<Record<string, any>>;
    }>;
}>;
export type StatusCheckSchema = TypeOf<typeof statusCheckSchema>;
declare const instructionSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    textPre: import("@kbn/config-schema").Type<string | undefined>;
    commands: import("@kbn/config-schema").Type<string[] | undefined>;
    textPost: import("@kbn/config-schema").Type<string | undefined>;
    customComponentName: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type Instruction = TypeOf<typeof instructionSchema>;
declare const instructionVariantSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    instructions: import("@kbn/config-schema").Type<Readonly<{
        title?: string | undefined;
        textPre?: string | undefined;
        commands?: string[] | undefined;
        textPost?: string | undefined;
        customComponentName?: string | undefined;
    } & {}>[]>;
    initialSelected: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type InstructionVariant = TypeOf<typeof instructionVariantSchema>;
declare const instructionSetSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    callOut: import("@kbn/config-schema").Type<Readonly<{
        message?: string | undefined;
        iconType?: string | undefined;
    } & {
        title: string;
    }> | undefined>;
    instructionVariants: import("@kbn/config-schema").Type<Readonly<{
        initialSelected?: boolean | undefined;
    } & {
        id: string;
        instructions: Readonly<{
            title?: string | undefined;
            textPre?: string | undefined;
            commands?: string[] | undefined;
            textPost?: string | undefined;
            customComponentName?: string | undefined;
        } & {}>[];
    }>[]>;
    statusCheck: import("@kbn/config-schema").Type<Readonly<{
        success?: string | undefined;
        error?: string | undefined;
        text?: string | undefined;
        title?: string | undefined;
        btnLabel?: string | undefined;
    } & {
        esHitsCheck: Readonly<{} & {
            index: string | string[];
            query: Record<string, any>;
        }>;
    }> | undefined>;
}>;
export type InstructionSetSchema = TypeOf<typeof instructionSetSchema>;
declare const instructionsSchema: import("@kbn/config-schema").ObjectType<{
    instructionSets: import("@kbn/config-schema").Type<Readonly<{
        title?: string | undefined;
        callOut?: Readonly<{
            message?: string | undefined;
            iconType?: string | undefined;
        } & {
            title: string;
        }> | undefined;
        statusCheck?: Readonly<{
            success?: string | undefined;
            error?: string | undefined;
            text?: string | undefined;
            title?: string | undefined;
            btnLabel?: string | undefined;
        } & {
            esHitsCheck: Readonly<{} & {
                index: string | string[];
                query: Record<string, any>;
            }>;
        }> | undefined;
    } & {
        instructionVariants: Readonly<{
            initialSelected?: boolean | undefined;
        } & {
            id: string;
            instructions: Readonly<{
                title?: string | undefined;
                textPre?: string | undefined;
                commands?: string[] | undefined;
                textPost?: string | undefined;
                customComponentName?: string | undefined;
            } & {}>[];
        }>[];
    }>[]>;
}>;
export type InstructionsSchema = TypeOf<typeof instructionsSchema>;
export declare const tutorialSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    category: import("@kbn/config-schema").Type<"security" | "metrics" | "other" | "logging">;
    name: import("@kbn/config-schema").Type<string>;
    moduleName: import("@kbn/config-schema").Type<string | undefined>;
    isBeta: import("@kbn/config-schema").Type<boolean | undefined>;
    shortDescription: import("@kbn/config-schema").Type<string>;
    euiIconType: import("@kbn/config-schema").Type<string | undefined>;
    longDescription: import("@kbn/config-schema").Type<string>;
    completionTimeMinutes: import("@kbn/config-schema").Type<number | undefined>;
    previewImagePath: import("@kbn/config-schema").Type<string | undefined>;
    onPrem: import("@kbn/config-schema").ObjectType<{
        instructionSets: import("@kbn/config-schema").Type<Readonly<{
            title?: string | undefined;
            callOut?: Readonly<{
                message?: string | undefined;
                iconType?: string | undefined;
            } & {
                title: string;
            }> | undefined;
            statusCheck?: Readonly<{
                success?: string | undefined;
                error?: string | undefined;
                text?: string | undefined;
                title?: string | undefined;
                btnLabel?: string | undefined;
            } & {
                esHitsCheck: Readonly<{} & {
                    index: string | string[];
                    query: Record<string, any>;
                }>;
            }> | undefined;
        } & {
            instructionVariants: Readonly<{
                initialSelected?: boolean | undefined;
            } & {
                id: string;
                instructions: Readonly<{
                    title?: string | undefined;
                    textPre?: string | undefined;
                    commands?: string[] | undefined;
                    textPost?: string | undefined;
                    customComponentName?: string | undefined;
                } & {}>[];
            }>[];
        }>[]>;
    }>;
    elasticCloud: import("@kbn/config-schema").Type<Readonly<{} & {
        instructionSets: Readonly<{
            title?: string | undefined;
            callOut?: Readonly<{
                message?: string | undefined;
                iconType?: string | undefined;
            } & {
                title: string;
            }> | undefined;
            statusCheck?: Readonly<{
                success?: string | undefined;
                error?: string | undefined;
                text?: string | undefined;
                title?: string | undefined;
                btnLabel?: string | undefined;
            } & {
                esHitsCheck: Readonly<{} & {
                    index: string | string[];
                    query: Record<string, any>;
                }>;
            }> | undefined;
        } & {
            instructionVariants: Readonly<{
                initialSelected?: boolean | undefined;
            } & {
                id: string;
                instructions: Readonly<{
                    title?: string | undefined;
                    textPre?: string | undefined;
                    commands?: string[] | undefined;
                    textPost?: string | undefined;
                    customComponentName?: string | undefined;
                } & {}>[];
            }>[];
        }>[];
    }> | undefined>;
    onPremElasticCloud: import("@kbn/config-schema").Type<Readonly<{} & {
        instructionSets: Readonly<{
            title?: string | undefined;
            callOut?: Readonly<{
                message?: string | undefined;
                iconType?: string | undefined;
            } & {
                title: string;
            }> | undefined;
            statusCheck?: Readonly<{
                success?: string | undefined;
                error?: string | undefined;
                text?: string | undefined;
                title?: string | undefined;
                btnLabel?: string | undefined;
            } & {
                esHitsCheck: Readonly<{} & {
                    index: string | string[];
                    query: Record<string, any>;
                }>;
            }> | undefined;
        } & {
            instructionVariants: Readonly<{
                initialSelected?: boolean | undefined;
            } & {
                id: string;
                instructions: Readonly<{
                    title?: string | undefined;
                    textPre?: string | undefined;
                    commands?: string[] | undefined;
                    textPost?: string | undefined;
                    customComponentName?: string | undefined;
                } & {}>[];
            }>[];
        }>[];
    }> | undefined>;
    artifacts: import("@kbn/config-schema").Type<Readonly<{
        application?: Readonly<{} & {
            path: string;
            label: string;
        }> | undefined;
        exportedFields?: Readonly<{} & {
            documentationUrl: string;
        }> | undefined;
    } & {
        dashboards: Readonly<{
            linkLabel?: string | undefined;
        } & {
            id: string;
            isOverview: boolean;
        }>[];
    }> | undefined>;
    omitServerless: import("@kbn/config-schema").Type<boolean | undefined>;
    customStatusCheckName: import("@kbn/config-schema").Type<string | undefined>;
    integrationBrowserCategories: import("@kbn/config-schema").Type<string[] | undefined>;
    eprPackageOverlap: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type TutorialSchema = TypeOf<typeof tutorialSchema>;
export {};
