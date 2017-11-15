import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import { withState } from 'recompose';
import { encode } from '../../../common/lib/dataurl';

const ImageUploadArgInput = ({ typeInstance, onAssetAdd, onValueChange, setLoading, isLoading }) => {
  const { name } = typeInstance;

  function handleUpload(ev) {
    const [ upload ] = ev.target.files;
    setLoading(true); // start loading indicator

    return encode(upload)
    .then(dataurl => onAssetAdd('dataurl', dataurl))
    .then((assetId) => {
      setLoading(false); // stop loading indicator

      onValueChange({
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'asset',
          arguments: {
            _: [assetId],
          },
        }],
      });
    });
  }

  return (
    <FormGroup key={name} controlId="formControlsSelect">
      <ControlLabel>
        Image Upload {isLoading ? <span className="fa fa-spinner fa-pulse" /> : null}
      </ControlLabel>
      <div className="canvas__argtype--image">
        <input type="file" onChange={handleUpload} disabled={isLoading} />
      </div>
    </FormGroup>
  );
};

ImageUploadArgInput.propTypes = {
  onAssetAdd: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
  setLoading: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export const imageUpload = () => ({
  name: 'imageUpload',
  displayName: 'Image Upload',
  help: 'Select or upload an image',
  template: withState('isLoading', 'setLoading', false)(ImageUploadArgInput),
});
