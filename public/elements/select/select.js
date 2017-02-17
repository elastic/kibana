import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import Select from 'react-select';
import icon from './icon.svg';
import _ from 'lodash';
import uuid from 'uuid/v4';

elements.push(new Element('select', {
  displayName: 'Select Filter',
  icon: icon,
  args: [
    new Arg('column', {
      expand: true,
      type: 'string',
      default: 'model',
      help: `The field on which to filter. Different sources may handle this in different ways.
              Most sources will ignore fields they do not know about.`
    }),
    new Arg('options', {
      expand: true,
      type: 'tags',
      default: ['Baja', 'Impreza', 'Outback'],
      help: '',
    }),
  ],
  template: class SelectElement extends React.PureComponent {
    constructor(props) {
      super(props);
    }

    render() {
      const {args, setArg, setFilter, filter} = this.props;

      let filterValue = _.get(filter, 'value.value');
      filterValue = _.isUndefined(filterValue) ? undefined : {value: filterValue, label: filterValue};

      // Uhg, react-select mutates this if a user adds something.
      const selectOptions = _.map(args.options, opt => {
        return {label: opt, value: opt};
      });

      const onChange = (selectObj) => {
        setArg('options', _.map(selectOptions, 'value'));
        setFilter(!_.get(selectObj, 'value') ? undefined : {
          type: 'exactly',
          value: {
            column: args.column,
            value: selectObj.value
          }
        });
      };

      return (
        <div className="rework--select-element">
          <Select.Creatable
            multi={false}
            options={selectOptions}
            onChange={onChange}
            value={filterValue}
            clearable={true}
          />
        </div>
      );
    }

  }
}));
