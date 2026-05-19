export declare const INSTRUCTION_VARIANT: {
    ESC: string;
    OSX: string;
    DEB: string;
    RPM: string;
    DOCKER: string;
    WINDOWS: string;
    NODE: string;
    DJANGO: string;
    FLASK: string;
    RAILS: string;
    RACK: string;
    JS: string;
    GO: string;
    JAVA: string;
    DOTNET: string;
    LINUX: string;
    PHP: string;
    FLEET: string;
    OPEN_TELEMETRY: string;
    OTHER_LINUX: string;
};
/**
 * Convert instruction variant id into display text.
 *
 * @params {String} id - instruction variant id as defined from INSTRUCTION_VARIANT
 * @return {String} display name
 */
export declare function getDisplayText(id: keyof typeof INSTRUCTION_VARIANT): string;
