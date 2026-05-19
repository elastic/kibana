import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { Services } from '../services';
/**
 * A set of e-commerce images for use in Storybook stories.
 */
export declare const ecommerceImages: {
    previewImagePath: any;
    darkPreviewImagePath: any;
    iconPath: any;
};
/**
 * A mocked sample data set for use in Storybook stories.
 */
export declare const mockDataSet: SampleDataSet;
/**
 * Customize the Sample Data Set mock.
 */
export declare const getMockDataSet: (params?: Partial<SampleDataSet>) => {
    appLinks: import("@kbn/home-sample-data-types").AppLink[];
    defaultIndex: string;
    description: string;
    id: string;
    name: string;
    overviewDashboard: string;
    previewImagePath: string;
    darkPreviewImagePath?: string;
    iconPath?: string;
    status?: import("@kbn/home-sample-data-types").InstalledStatus;
    statusMsg?: string;
};
/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;
/**
 * Returns Storybook-compatible service abstractions for the `SampleDataCard` Provider.
 */
export declare const getStoryServices: (params: Params) => Services;
/**
 * Returns the Storybook arguments for `SampleDataCard`, for its stories and for
 * consuming component stories.
 */
export declare const getStoryArgTypes: () => {
    name: {
        control: {
            type: string;
        };
        defaultValue: string;
    };
    description: {
        control: {
            type: string;
        };
        defaultValue: string;
    };
    status: {
        options: (string | undefined)[];
        control: {
            type: string;
        };
        defaultValue: import("@kbn/home-sample-data-types").InstalledStatus | undefined;
    };
    includeAppLinks: {
        control: string;
        defaultValue: boolean;
    };
    simulateErrors: {
        control: string;
        defaultValue: boolean;
    };
};
/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export declare const getMockServices: (params?: Partial<Services>) => Services;
