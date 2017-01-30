import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import Dropzone from 'react-dropzone';
import './image.less';

argTypes.push(new ArgType('image', {
  default: '',
  form: ({commit, value, options}) => {
    const storeValue = (value) => {
      console.log(value);
      const reader = new FileReader();

      reader.onload = function () {
        commit(reader.result);
      };

      reader.readAsDataURL(value[0]);
    };
    return (
      <div>
        <Dropzone
          style={{width: '100%'}}
          className="rework--image-upload"
          multiple={false} accept="image/*"
          onDrop={storeValue}>
          <div style={{
            height: '100px',
            backgroundImage: `url(${value})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain'
          }}/>
          <div>
            <h4>Drop your image here</h4>
            Or click to select an image to upload.
          </div>
        </Dropzone>

      </div>
    );
  },
  resolve: (value, state) => {
    return value;
  }
}));
