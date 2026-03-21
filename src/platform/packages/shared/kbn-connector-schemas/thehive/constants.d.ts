export declare const CONNECTOR_ID = ".thehive";
export declare const CONNECTOR_NAME: string;
export declare enum SUB_ACTION {
    PUSH_TO_SERVICE = "pushToService",
    CREATE_ALERT = "createAlert"
}
export declare enum TheHiveSeverity {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4
}
export declare enum TheHiveTLP {
    CLEAR = 0,
    GREEN = 1,
    AMBER = 2,
    AMBER_STRICT = 3,
    RED = 4
}
