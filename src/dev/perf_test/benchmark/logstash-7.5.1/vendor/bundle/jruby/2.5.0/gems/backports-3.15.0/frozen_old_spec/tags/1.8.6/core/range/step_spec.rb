fails:Range#step with inclusive end and Integer values yields Float values incremented by a Float step
fails:Range#step with inclusive end and Float values returns Float values of 'step * n + begin <= end'
fails:Range#step with inclusive end and Integer, Float values yields Float values incremented by 1 and less than or equal to end when not passed a step
fails:Range#step with inclusive end and Integer, Float values yields Float values incremented by an Integer step
fails:Range#step with inclusive end and Integer, Float values yields Float values incremented by a Float step
fails:Range#step with inclusive end and String values raises a TypeError when passed a Float step
fails:Range#step with exclusive end and Integer values yields Float values incremented by a Float step
fails:Range#step with exclusive end and Float values returns Float values of 'step * n + begin < end'
fails:Range#step with exclusive end and Integer, Float values yields Float values incremented by 1 and less than end when not passed a step
fails:Range#step with exclusive end and Integer, Float values yields Float values incremented by an Integer step
fails:Range#step with exclusive end and Integer, Float values yields an Float and then Float values incremented by a Float step
fails:Range#step with exclusive end and String values raises a TypeError when passed a Float step
