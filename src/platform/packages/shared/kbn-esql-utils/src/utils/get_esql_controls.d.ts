import type { AggregateQuery, Query } from '@kbn/es-query';
import { type PresentationContainer } from '@kbn/presentation-publishing';
export declare function getEsqlControls(presentationContainer: PresentationContainer, query: AggregateQuery | Query | undefined): {
    [x: string]: string | number | boolean | import("@kbn/utility-types").SerializableRecord | import("@kbn/utility-types/src/serializable").SerializableArray | {
        title?: string | undefined;
        display_settings?: Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined;
        single_select?: boolean | undefined;
        available_options?: string[] | undefined;
        selected_options: string[];
        variable_name: string;
        variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        esql_query: string;
        control_type: "STATIC_VALUES" | "VALUES_FROM_QUERY";
        type: string;
    } | null | undefined;
} | undefined;
