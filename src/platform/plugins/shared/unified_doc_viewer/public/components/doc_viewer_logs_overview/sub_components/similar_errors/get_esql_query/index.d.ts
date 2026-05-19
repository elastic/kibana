interface ErrorField {
    fieldName: string;
    value: string | string[];
}
export declare function getEsqlQuery({ serviceName, culprit, message, type, }: {
    serviceName?: string;
    culprit?: string;
    message?: ErrorField;
    type?: ErrorField;
}): import("@kbn/esql-composer").QueryOperator | undefined;
export {};
