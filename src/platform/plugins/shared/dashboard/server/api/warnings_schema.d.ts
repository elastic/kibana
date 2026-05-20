export declare const warningsSchema: import("@kbn/config-schema").Type<Readonly<{
    panel_references?: Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[] | undefined;
} & {
    type: "dropped_panel";
    message: string;
    panel_type: string;
    panel_config: Readonly<{} & {}>;
}>[]>;
