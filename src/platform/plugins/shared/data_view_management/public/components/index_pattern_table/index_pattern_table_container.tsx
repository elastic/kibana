import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternTableWithRouter } from './index_pattern_table';
import type { IndexPatternManagmentContext } from '../../types';
import { RouteComponentProps, useLocation, withRouter } from 'react-router-dom';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

interface Props extends RouteComponentProps {
    canSave: boolean;
    showCreateDialog?: boolean;
}

const title = i18n.translate('indexPatternManagement.dataViewTable.title', {
    defaultMessage: 'Data Views',
});

export const IndexPatternTableContainer = ({ history, canSave, showCreateDialog: initialShowCreateDialog = false }: Props) => {
    const {
        dataViews,
        IndexPatternEditor,
    } = useKibana<IndexPatternManagmentContext>().services;
    const [showCreateDialog, setShowCreateDialog] = useState(initialShowCreateDialog ?? false);
    const isRollup = new URLSearchParams(useLocation().search).get('type') === DataViewType.ROLLUP &&
        dataViews.getRollupsEnabled();
    return (
        <div data-test-subj="indexPatternTable" role="region" aria-label={title}>
            <IndexPatternTableWithRouter canSave={canSave} setShowCreateDialog={setShowCreateDialog} title={title} />
            {showCreateDialog && (
                <IndexPatternEditor
                    onSave={(indexPattern) => {
                        history.push(`patterns/${indexPattern.id}`);
                    }}
                    onCancel={() => setShowCreateDialog(false)}
                    defaultTypeIsRollup={isRollup}
                />
            )
            }
        </div>
    )
};

export const IndexPatternTableContainerRouter = withRouter(IndexPatternTableContainer);