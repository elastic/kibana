export declare const warningsSchema: import("@kbn/config-schema").Type<(Readonly<{
    panel_references?: Readonly<{} & {
        id: string;
        type: string;
        name: string;
    }>[] | undefined;
} & {
    type: "dropped_panel";
    message: string;
    panel_type: string;
    panel_config: Readonly<{} & {}>;
}> | Readonly<{
    value?: any;
} & {
    type: "dropped_property";
    message: string;
    key: string;
}>)[]>;
