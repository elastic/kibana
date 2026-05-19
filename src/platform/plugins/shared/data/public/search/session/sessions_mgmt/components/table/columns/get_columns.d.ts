import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { OnActionComplete } from '../..';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { UISession } from '../../../types';
import type { SearchUsageCollector } from '../../../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../../../server/config';
export declare const getColumns: ({ core, api, config, timezone, onActionComplete, kibanaVersion, searchUsageCollector, }: {
    core: CoreStart;
    api: SearchSessionsMgmtAPI;
    config: SearchSessionsConfigSchema;
    timezone: string;
    onActionComplete: OnActionComplete;
    kibanaVersion: string;
    searchUsageCollector: SearchUsageCollector;
}) => Array<EuiBasicTableColumn<UISession>>;
