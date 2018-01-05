import { getTableData } from './get_table_data';
import { getSeriesData } from './get_series_data';
export default function getPanelData(req) {
  return panel => {
    if (panel.type === 'table') return getTableData(req, panel);
    return getSeriesData(req, panel);
  };
}
