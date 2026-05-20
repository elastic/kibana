import { type HasParentApi, type PublishesSavedObjectId, type PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { DiscoverAppLocatorParams } from '../../../common';
import type { PublishesSavedSearch, PublishesSelectedTabId } from '../types';
export declare const getDiscoverLocatorParams: (api: PublishesSavedSearch & Partial<PublishesSavedObjectId & PublishesSelectedTabId & PublishesUnifiedSearch & HasParentApi>) => DiscoverAppLocatorParams;
