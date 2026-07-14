/** @internal */
export declare const REACT_FATAL_ERROR_EVENT_TYPE = "fatal-error-react";
/** @internal */
export interface ReactFatalError {
    component_name: string;
    error_message: string;
}
/** @internal */
export declare const reactFatalErrorSchema: {
    component_name: {
        type: "keyword";
        _meta: {
            description: string;
            optional: false;
        };
    };
    component_stack: {
        type: "text";
        _meta: {
            description: string;
            optional: false;
        };
    };
    component_render_min_duration_ms: {
        type: "long";
        _meta: {
            description: string;
            optional: false;
        };
    };
    has_transient_navigation: {
        type: "boolean";
        _meta: {
            description: string;
            optional: false;
        };
    };
    error_message: {
        type: "keyword";
        _meta: {
            description: string;
            optional: false;
        };
    };
    error_stack: {
        type: "text";
        _meta: {
            description: string;
            optional: false;
        };
    };
};
