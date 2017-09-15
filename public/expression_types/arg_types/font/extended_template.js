import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { LabeledInput } from '../../../components/labeled_input';
import { FontPicker } from '../../../components/font_picker';

export const extendedTemplate = (props) => {
  const { typeInstance, onValueChange, labels, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});

  // TODO: Validate input

  return (
    <div>
      <div style={{ display: 'inline-block', width: 80 }}>
        <FontPicker
          value="'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif"
          onSelect={console.log}
        />
      </div>
      <ButtonGroup>
        <Button><span style={{ fontWeight: 'bold' }}>B</span></Button>
        <Button><span style={{ fontStyle: 'italic' }}>I</span></Button>
        <Button><span style={{ textDecoration: 'underline' }}>U</span></Button>
      </ButtonGroup>

    </div>

  );
};

extendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array.isRequired,
  renderError: PropTypes.func,
};
