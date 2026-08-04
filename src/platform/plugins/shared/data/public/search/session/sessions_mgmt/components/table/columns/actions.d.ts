import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { UISession } from '../../../types';
import type { OnActionComplete } from '../actions';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
export declare const actionsColumn: ({ api, core, onActionComplete, allowedActions, isWithinFlyout, }: {
    core: CoreStart;
    api: SearchSessionsMgmtAPI;
    onActionComplete: OnActionComplete;
    allowedActions?: UISession["actions"];
    isWithinFlyout?: boolean;
}) => EuiBasicTableColumn<UISession>;
