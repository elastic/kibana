import type { CoreSetup } from '@kbn/core/public';
import { FieldFormatsRegistry } from '../common';
import type { FieldFormatsSetup, FieldFormatsStart } from '.';
export declare const getFieldFormatsRegistry: (core: CoreSetup) => FieldFormatsRegistry;
export declare const fieldFormatsServiceMock: {
    create: () => jest.Mocked<{
        start: () => FieldFormatsStart;
        setup: () => FieldFormatsSetup;
    }>;
    createSetupContract: () => FieldFormatsSetup;
    createStartContract: () => FieldFormatsStart;
};
