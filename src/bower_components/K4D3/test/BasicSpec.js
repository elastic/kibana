describe('Simple Tests:', function() {
    it("b is true because its true man", function() {
        var b = true;
        expect(b).toBe(true);
    });

    it('e is not a number', function() {
        var e = 1;
        expect(e).toBe(1);
    });
});