import React from 'react';
import Dropzone from 'react-dropzone';
import './image_upload.less';

export const ImageUpload = ({value, onChange}) => {
  const readFile = (value) => {
    const reader = new FileReader();

    reader.onload = function () {
      onChange(reader.result);
    };

    reader.readAsDataURL(value[0]);
  };

  return (
    <div>
      <Dropzone
        style={{width: '100%'}}
        className="rework--image-upload"
        multiple={false} accept="image/*"
        onDrop={readFile}>
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

};
