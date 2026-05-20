import type { MockedKeys } from '@kbn/utility-types-jest';
import { SearchSource } from './search_source';
import type { ISearchStartSearchSource, ISearchSource, SearchSourceFields } from './types';
export declare const searchSourceInstanceMock: MockedKeys<ISearchSource>;
export declare const searchSourceCommonMock: jest.Mocked<ISearchStartSearchSource>;
export declare const createSearchSourceMock: (fields?: SearchSourceFields, response?: any, search?: jest.Mock) => SearchSource;
