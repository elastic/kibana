/**
 * @public
 * Represents a meta-information about a Kibana entity initiating a search request.
 */
export type KibanaExecutionContext = {
    /**
     * Kibana application initiated an operation.
     * */
    readonly type?: string;
    /** public name of an application or a user-facing feature */
    readonly name?: string;
    /** id of the current space */
    readonly space?: string;
    /**
     * a stand alone, logical unit such as an application page or tab
     * @remarks This value should NOT include unique identifiers like IDs or names.
     * @example 'reportingHome' or '/myApp/myPage/{id}/edit
     */
    readonly page?: string;
    /** unique value to identify the source */
    readonly id?: string;
    /** human readable description. For example, a vis title, action name */
    readonly description?: string;
    /** in browser - url to navigate to a current page, on server - endpoint path, for task: task SO url */
    readonly url?: string;
    /** Metadata attached to the field. An optional parameter that allows to describe the execution context in more detail. **/
    readonly meta?: {
        [key: string]: string | number | boolean | undefined;
    };
    /** an inner context spawned from the current context. */
    child?: KibanaExecutionContext;
};
