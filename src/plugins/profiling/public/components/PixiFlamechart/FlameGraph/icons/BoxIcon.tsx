import React, { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const BoxIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 14 16"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g strokeWidth="1.2" fill="none" fillRule="evenodd">
        <path d="M13.0621778 4.5L7 8 .93782217 4.5" />
        <path d="M7 1l6.0621778 3.5v7L7 15 .93782217 11.5v-7z" />
        <path strokeLinecap="square" d="M7 8v6" />
      </g>
    </svg>
  );
};

export default BoxIcon;
