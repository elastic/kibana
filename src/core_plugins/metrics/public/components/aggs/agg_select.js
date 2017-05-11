import React, { PropTypes, Component } from 'react';
import Select from 'react-select';

const metricAggs = [
  { label: 'Average', value: 'avg' },
  { label: 'Cardinality', value: 'cardinality' },
  { label: 'Count', value: 'count' },
  { label: 'Filter Ratio', value: 'filter_ratio' },
  { label: 'Max', value: 'max' },
  { label: 'Min', value: 'min' },
  { label: 'Percentile', value: 'percentile' },
  { label: 'Percentile Rank', value: 'percentile_rank' },
  { label: 'Static Value', value: 'static' },
  { label: 'Std. Deviation', value: 'std_deviation' },
  { label: 'Sum', value: 'sum' },
  { label: 'Sum of Squares', value: 'sum_of_squares' },
  { label: 'Value Count', value: 'value_count' },
  { label: 'Variance', value: 'variance' }
];

const pipelineAggs = [
  { label: 'Calculation', value: 'calculation' },
  { label: 'Cumulative Sum', value: 'cumulative_sum' },
  { label: 'Derivative', value: 'derivative' },
  { label: 'Moving Average', value: 'moving_average' },
  { label: 'Positive Only', value: 'positive_only' },
  { label: 'Serial Difference', value: 'serial_diff' },
  { label: 'Series Agg', value: 'series_agg' }
];

const siblingAggs = [
  { label: 'Overall Average', value: 'avg_bucket' },
  { label: 'Overall Max', value: 'max_bucket' },
  { label: 'Overall Min', value: 'min_bucket' },
  { label: 'Overall Std. Deviation', value: 'std_deviation_bucket' },
  { label: 'Overall Sum', value: 'sum_bucket' },
  { label: 'Overall Sum of Squares', value: 'sum_of_squares_bucket' },
  { label: 'Overall Variance', value: 'variance_bucket' }
];

class AggSelectOption extends Component {

  constructor(props) {
    super(props);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
  }

  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    this.props.onSelect(this.props.option, event);
  }

  handleMouseEnter(event) {
    this.props.onFocus(this.props.option, event);
  }

  handleMouseMove(event) {
    if (this.props.isFocused) return;
    this.props.onFocus(this.props.option, event);
  }

  render() {
    const { label, heading, pipeline } = this.props.option;
    const style = {
      paddingLeft: heading ? 0 : 10
    };
    if (heading) {
      let note;
      if (pipeline) {
        note = (<span className="vis_editor__agg_select-note">(requires child aggregation)</span>);
      }
      return (
        <div
          className="Select-option vis_editor__agg_select-heading"
          onMouseEnter={this.handleMouseEnter}
          onMouseDown={this.handleMouseDown}
          onMouseMove={this.handleMouseMove}
          ariaLabel={label}
        >
          <span className="Select-value-label" style={style}>
            <strong>{label}</strong>
            {note}
          </span>
        </div>
      );
    }
    return (
      <div
        className={this.props.className}
        onMouseEnter={this.handleMouseEnter}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        ariaLabel={label}
      >
        <span className="Select-value-label" style={style}>
          { this.props.children }
        </span>
      </div>
    );
  }

}

AggSelectOption.props = {
  children: PropTypes.node,
  className: PropTypes.string,
  isDisabled: PropTypes.bool,
  isFocused: PropTypes.bool,
  isSelected: PropTypes.bool,
  onFocus: PropTypes.func,
  onSelect: PropTypes.func,
  option: PropTypes.object.isRequired,
};

function AggSelect(props) {
  const { siblings, panelType } = props;

  let enablePipelines = siblings.some(s => !!metricAggs.find(m => m.value === s.type));
  if (siblings.length <= 1) enablePipelines = false;

  let options;
  if (panelType === 'metrics') {
    options = metricAggs;
  } else {
    options = [
      { label: 'Metric Aggregations', value: null, heading: true, disabled: true },
      ...metricAggs,
      { label: 'Parent Pipeline Aggregations', value: null, pipeline: true, heading: true, disabled: true },
      ...pipelineAggs.map(agg => ({ ...agg, disabled: !enablePipelines })),
      { label: 'Sibling Pipeline Aggregations', value: null, pipeline: true, heading: true, disabled: true },
      ...siblingAggs.map(agg => ({ ...agg, disabled: !enablePipelines }))
    ];
  }

  const handleChange = (value) => {
    if (value.disabled) return;
    if (value.value) props.onChange(value);
  };

  return (
    <div className="vis_editor__row_item">
      <Select
        clearable={false}
        options={options}
        value={props.value}
        optionComponent={AggSelectOption}
        onChange={handleChange}/>
    </div>
  );
}

AggSelect.propTypes = {
  onChange: PropTypes.func,
  panelType: PropTypes.string,
  siblings: PropTypes.array,
  value: PropTypes.string
};

export default AggSelect;
