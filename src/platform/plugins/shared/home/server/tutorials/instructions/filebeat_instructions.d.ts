import type { Platform, TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
export declare const createFilebeatInstructions: (context: TutorialContext) => {
    INSTALL: {
        OSX: {
            title: string;
            textPre: string;
            commands: string[];
        };
        DEB: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        RPM: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        WINDOWS: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
    };
    START: {
        OSX: {
            title: string;
            textPre: string;
            commands: string[];
        };
        DEB: {
            title: string;
            textPre: string;
            commands: string[];
        };
        RPM: {
            title: string;
            textPre: string;
            commands: string[];
        };
        WINDOWS: {
            title: string;
            textPre: string;
            commands: string[];
        };
    };
    CONFIG: {
        OSX: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        DEB: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        RPM: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        WINDOWS: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
    };
};
export declare const createFilebeatCloudInstructions: () => {
    CONFIG: {
        OSX: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        DEB: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        RPM: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        WINDOWS: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
    };
};
export declare const createFilebeatCloudInstructionsServerless: () => {
    CONFIG: {
        OSX: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        DEB: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        RPM: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
        WINDOWS: {
            title: string;
            textPre: string;
            commands: string[];
            textPost: string;
        };
    };
};
export declare function filebeatEnableInstructions(moduleName: string): {
    OSX: {
        title: string;
        textPre: string;
        commands: string[];
        textPost: string;
    };
    DEB: {
        title: string;
        commands: string[];
        textPost: string;
    };
    RPM: {
        title: string;
        commands: string[];
        textPost: string;
    };
    WINDOWS: {
        title: string;
        textPre: string;
        commands: string[];
        textPost: string;
    };
};
export declare function filebeatStatusCheck(moduleName: string): {
    title: string;
    text: string;
    btnLabel: string;
    success: string;
    error: string;
    esHitsCheck: {
        index: string;
        query: {
            bool: {
                filter: {
                    term: {
                        'event.module': string;
                    };
                };
            };
        };
    };
};
export declare function onPremInstructions(moduleName: string, platforms: readonly Platform[] | undefined, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                commands: string[];
                textPost: string;
            } | {
                title: string;
                textPre: string;
                commands: string[];
            })[];
        }[];
        statusCheck: {
            title: string;
            text: string;
            btnLabel: string;
            success: string;
            error: string;
            esHitsCheck: {
                index: string;
                query: {
                    bool: {
                        filter: {
                            term: {
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
export declare function onPremCloudInstructions(moduleName: string, platforms: readonly Platform[] | undefined, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                textPre: string;
            } | {
                title: string;
                commands: string[];
                textPost: string;
            })[];
        }[];
        statusCheck: {
            title: string;
            text: string;
            btnLabel: string;
            success: string;
            error: string;
            esHitsCheck: {
                index: string;
                query: {
                    bool: {
                        filter: {
                            term: {
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
export declare function cloudInstructions(moduleName: string, platforms: readonly Platform[] | undefined, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                commands: string[];
                textPost: string;
            } | {
                title: string;
                textPre: string;
                commands: string[];
            })[];
        }[];
        statusCheck: {
            title: string;
            text: string;
            btnLabel: string;
            success: string;
            error: string;
            esHitsCheck: {
                index: string;
                query: {
                    bool: {
                        filter: {
                            term: {
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
