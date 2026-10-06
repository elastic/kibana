import type { Logger } from '@kbn/logging';
export declare function createCummulativeLogger(logger: Logger): Logger & {
    dump: () => void;
    clear: () => void;
};
