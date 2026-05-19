export declare const warningsSchema: import("@kbn/config-schema").Type<Readonly<{
    panel_references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
} & {
    message: string;
    type: "dropped_panel";
    panel_type: string;
    panel_config: Readonly<{} & {}>;
}>[]>;
