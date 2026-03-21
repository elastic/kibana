import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { SearchUsageCollector } from '../../../../../collectors';
import type { BackgroundSearchOpenedHandler, UISession } from '../../../types';
export declare const nameColumn: ({ core, searchUsageCollector, kibanaVersion, onBackgroundSearchOpened, }: {
    core: CoreStart;
    searchUsageCollector: SearchUsageCollector;
    kibanaVersion: string;
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
}) => EuiBasicTableColumn<UISession>;
