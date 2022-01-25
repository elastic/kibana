import React, { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const PercentageIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 14 14"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform="translate(-1 -1)"
        strokeWidth="1.2"
        fill="none"
        fillRule="evenodd"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.25 2.75l-10.5 10.5" />
        <circle cx="3.875" cy="3.875" r="1.875" />
        <circle cx="12.125" cy="12.125" r="1.875" />
      </g>
    </svg>
  );
};

export default PercentageIcon;
